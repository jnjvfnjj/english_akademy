package com.school.crm.service.impl;

import com.school.crm.design.builder.Receipt;
import com.school.crm.design.strategy.*;
import com.school.crm.design.observer.StudentBalanceEvent;
import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.TransactionDto;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.Transaction;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.TransactionRepository;
import com.school.crm.service.TransactionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDate;

@Service
public class TransactionServiceImpl implements TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionServiceImpl.class);
    private final TransactionRepository transactionRepository;
    private final StudentRepository studentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public TransactionServiceImpl(TransactionRepository transactionRepository, StudentRepository studentRepository, ApplicationEventPublisher eventPublisher) {
        this.transactionRepository = transactionRepository;
        this.studentRepository = studentRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionDto> getAllTransactions() {
        return transactionRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionDto> getTransactionsByStudent(Long studentId) {
        if (!studentRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student not found with ID: " + studentId);
        }
        return transactionRepository.findByStudentId(studentId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TransactionDto createTransaction(TransactionDto dto) {
        Student student = null;
        double finalAmount = dto.getAmount();
        
        // If student ID is provided, fetch the student entity
        if (dto.getStudentId() != null) {
            student = studentRepository.findById(dto.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + dto.getStudentId()));
        }

        // Trivial/Non-Trivial Business Logic with Design Pattern Applications:
        // Case: Tuition Fee Purchase - demonstrates Strategy Pattern & Builder Pattern
        if (!Boolean.FALSE.equals(dto.getApplyToStudentBalance())
                && student != null
                && "Income".equalsIgnoreCase(dto.getType())
                && "Tuition".equalsIgnoreCase(dto.getCategory())) {
            
            // 1. STRATEGY PATTERN: Select pricing policy dynamically based on request packaging tier
            int hoursToBuy;
            PricingContext pricingContext = null;
            if (dto.getLessonsPurchased() != null) {
                hoursToBuy = dto.getLessonsPurchased();
            } else {
                String tier = dto.getPricingTier() == null ? "REGULAR" : dto.getPricingTier().toUpperCase();
                PricingStrategy selectedStrategy = switch (tier) {
                    case "STANDARD_PACKAGE" -> new PackagePricingStrategy();
                    case "VIP_GOLD" -> new VipGoldPricingStrategy();
                    default -> new RegularPricingStrategy();
                };
                pricingContext = new PricingContext(selectedStrategy);
                hoursToBuy = (int) Math.round(dto.getAmount() / 25.0);
                if (hoursToBuy <= 0) hoursToBuy = 10;
                finalAmount = pricingContext.executeStrategy(hoursToBuy);
            }

            int oldBalance = student.getBalance();
            student.addBalance(hoursToBuy);
            String currency = dto.getCurrency() == null
                    ? (dto.getLessonsPurchased() == null ? "USD" : "KGS")
                    : dto.getCurrency();
            String currentCurrency = student.getPaymentCurrency() == null ? "USD" : student.getPaymentCurrency();
            student.setTotalPaid(currency.equals(currentCurrency)
                    ? student.getTotalPaid() + finalAmount
                    : finalAmount);
            student.setPaymentCurrency(currency);
            LocalDate paidAt = dto.getDate();
            LocalDate expiresAt = dto.getExpiresAt() == null ? paidAt.plusMonths(1) : dto.getExpiresAt();
            student.setPaymentDate(paidAt);
            student.setPaymentAmount(finalAmount);
            student.setPaymentExpiresAt(expiresAt);
            studentRepository.save(student);

            // 2. BUILDER PATTERN: Construct formatted invoice Receipt
            Receipt invoice = new Receipt.ReceiptBuilder("TX-" + System.currentTimeMillis() / 1000, student.getName())
                    .studentEmail(student.getEmail())
                    .amount(finalAmount)
                    .hoursPurchased(hoursToBuy)
                    .pricingPolicy(pricingContext == null ? "Оплата заданного пакета занятий" : pricingContext.executeGetDescription())
                    .footerMessage("Tuition fees registered inside English School CRM. Good luck with your study!")
                    .build();

             // Store printable output in log console (demonstrating custom object printing)
            log.info("\n{}", invoice.generatePrintableText());
            
            // Override the description with receipt metadata for storage lookup
            dto.setDescription(dto.getDescription() + " (Invoiced Receipt: " + invoice.getReceiptNumber() + ")");

            // Publish balance event (Observer pattern)
            eventPublisher.publishEvent(new StudentBalanceEvent(
                    this, student.getId(), oldBalance, student.getBalance(),
                    "Tuition paid: purchased " + hoursToBuy + " hours and added to package credit."
            ));
            dto.setLessonsPurchased(hoursToBuy);
            dto.setExpiresAt(expiresAt);
            dto.setCurrency(currency);
        }
        // Case: Pay Tutor Salary - other non-trivial triggers
        else if (student != null && "Expense".equalsIgnoreCase(dto.getType()) && "Salary".equalsIgnoreCase(dto.getCategory())) {
            // Log expense and subtract total balance records or audit triggers
            log.info("[Salary Log] Expensing tutor salary payout for student tracking context.");
        }

        Transaction transaction = new Transaction(
                student,
                finalAmount,
                dto.getType(),
                dto.getCategory(),
                dto.getDate(),
                dto.getDescription()
        );
        transaction.setLessonsPurchased(dto.getLessonsPurchased());
        transaction.setExpiresAt(dto.getExpiresAt());
        transaction.setCurrency(dto.getCurrency() == null
                ? (dto.getLessonsPurchased() == null ? "USD" : "KGS")
                : dto.getCurrency());

        Transaction saved = transactionRepository.save(transaction);
        
        // Return response mapping
        TransactionDto responseDto = convertToDto(saved);
        if (dto.getPricingTier() != null) {
            responseDto.setPricingTier(dto.getPricingTier());
        }
        return responseDto;
    }

    @Override
    @Transactional
    public TransactionDto updateTransaction(Long id, TransactionDto dto) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
        Student student = dto.getStudentId() == null ? null : studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + dto.getStudentId()));
        transaction.setStudent(student);
        transaction.setAmount(dto.getAmount());
        transaction.setType(dto.getType());
        transaction.setCategory(dto.getCategory());
        transaction.setDate(dto.getDate());
        transaction.setLessonsPurchased(dto.getLessonsPurchased());
        transaction.setExpiresAt(dto.getExpiresAt());
        if (dto.getCurrency() != null) transaction.setCurrency(dto.getCurrency());
        transaction.setDescription(dto.getDescription());
        return convertToDto(transactionRepository.save(transaction));
    }

    @Override
    @Transactional
    public void deleteTransaction(Long id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
        transactionRepository.delete(transaction);
    }

    private TransactionDto convertToDto(Transaction transaction) {
        TransactionDto dto = new TransactionDto();
        dto.setId(transaction.getId());
        if (transaction.getStudent() != null) {
            dto.setStudentId(transaction.getStudent().getId());
            dto.setStudentName(transaction.getStudent().getName());
        }
        dto.setAmount(transaction.getAmount());
        dto.setType(transaction.getType());
        dto.setCategory(transaction.getCategory());
        dto.setDate(transaction.getDate());
        dto.setLessonsPurchased(transaction.getLessonsPurchased());
        dto.setExpiresAt(transaction.getExpiresAt());
        dto.setCurrency(transaction.getCurrency());
        dto.setDescription(transaction.getDescription());
        dto.setApplyToStudentBalance(false);
        return dto;
    }
}
