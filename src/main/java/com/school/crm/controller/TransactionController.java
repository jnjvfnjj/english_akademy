package com.school.crm.controller;

import com.school.crm.model.dto.TransactionDto;
import com.school.crm.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public ResponseEntity<List<TransactionDto>> getAllTransactions() {
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<TransactionDto>> getTransactionsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(transactionService.getTransactionsByStudent(studentId));
    }

    @PostMapping
    public ResponseEntity<TransactionDto> createTransaction(@Valid @RequestBody TransactionDto transactionDto) {
        TransactionDto created = transactionService.createTransaction(transactionDto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
}
