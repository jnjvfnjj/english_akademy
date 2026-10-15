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
        if (student != null && "Income".equalsIgnoreCase(dto.getType()) && "Tuition".equalsIgnoreCase(dto.getCategory())) {
            
            // 1. STRATEGY PATTERN: Select pricing policy dynamically based on request packaging tier
            PricingStrategy selectedStrategy;
            String tier = (dto.getPricingTier() != null) ? dto.getPricingTier().toUpperCase() : "REGULAR";
            
            switch (tier) {
                case "STANDARD_PACKAGE":
                    selectedStrategy = new PackagePricingStrategy();
                    break;
                case "VIP_GOLD":
                    selectedStrategy = new VipGoldPricingStrategy();
                    break;
                case "REGULAR":
                default:
                    selectedStrategy = new RegularPricingStrategy();
                    break;
            }
            
            PricingContext pricingContext = new PricingContext(selectedStrategy);
            
            // Let's assume the user supplied hour units in their transaction.
            // If they didn't, calculate based on supplied transaction money division.
            int hoursToBuy = (int) Math.round(dto.getAmount() / 25.0); // estimate hours if not explicitly set
            if (hoursToBuy <= 0) {
                hoursToBuy = 10; // Default package size
            }
            
            // Apply Strategy algorithm
            finalAmount = pricingContext.executeStrategy(hoursToBuy);
            
            // Refill student parameters
            int oldBalance = student.getBalance();
            student.addBalance(hoursToBuy);
            student.setTotalPaid(student.getTotalPaid() + finalAmount);
            studentRepository.save(student);

            // 2. BUILDER PATTERN: Construct formatted invoice Receipt
            Receipt invoice = new Receipt.ReceiptBuilder("TX-" + System.currentTimeMillis() / 1000, student.getName())
                    .studentEmail(student.getEmail())
                    .amount(finalAmount)
                    .hoursPurchased(hoursToBuy)
                    .pricingPolicy(pricingContext.executeGetDescription())
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

        Transaction saved = transactionRepository.save(transaction);
        
        // Return response mapping
        TransactionDto responseDto = convertToDto(saved);
        if (dto.getPricingTier() != null) {
            responseDto.setPricingTier(dto.getPricingTier());
        }
        return responseDto;
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
        dto.setDescription(transaction.getDescription());
        return dto;
    }
}
