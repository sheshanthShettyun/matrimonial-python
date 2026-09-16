package com.matrimonial.controller;

import com.matrimonial.dto.SendInterestRequest;
import com.matrimonial.entity.Interest;
import com.matrimonial.service.InterestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interests")
public class InterestController {

    private final InterestService interestService;

    public InterestController(InterestService interestService) {
        this.interestService = interestService;
    }

    @PostMapping("/send")
    public ResponseEntity<Interest> sendInterest(@Valid @RequestBody SendInterestRequest request) {
        Interest interest = interestService.sendInterest(request.getSenderId(), request.getReceiverId());
        return new ResponseEntity<>(interest, HttpStatus.CREATED);
    }

    @GetMapping("/sent/{senderId}")
    public ResponseEntity<List<Interest>> getSentInterests(@PathVariable Long senderId) {
        return ResponseEntity.ok(interestService.getSentInterests(senderId));
    }

    @GetMapping("/received/{receiverId}")
    public ResponseEntity<List<Interest>> getReceivedInterests(@PathVariable Long receiverId) {
        return ResponseEntity.ok(interestService.getReceivedInterests(receiverId));
    }

    @PutMapping("/{interestId}/accept")
    public ResponseEntity<Interest> acceptInterest(@PathVariable Long interestId) {
        return ResponseEntity.ok(interestService.acceptInterest(interestId));
    }

    @PutMapping("/{interestId}/reject")
    public ResponseEntity<Interest> rejectInterest(@PathVariable Long interestId) {
        return ResponseEntity.ok(interestService.rejectInterest(interestId));
    }

    @DeleteMapping("/{interestId}")
    public ResponseEntity<Void> deleteInterest(@PathVariable Long interestId) {
        interestService.deleteInterest(interestId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/match")
    public ResponseEntity<Map<String, Boolean>> checkMatch(
            @RequestParam Long user1, @RequestParam Long user2) {
        return ResponseEntity.ok(Map.of("matched", interestService.isMatched(user1, user2)));
    }
}
