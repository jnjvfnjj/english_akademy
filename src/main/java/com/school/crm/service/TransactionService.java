package com.school.crm.service;

import com.school.crm.model.dto.TransactionDto;
import java.util.List;

public interface TransactionService {
    List<TransactionDto> getAllTransactions();
    List<TransactionDto> getTransactionsByStudent(Long studentId);
    TransactionDto createTransaction(TransactionDto transactionDto);
}
