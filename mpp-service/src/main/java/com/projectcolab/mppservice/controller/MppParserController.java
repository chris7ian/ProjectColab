package com.projectcolab.mppservice.controller;

import com.projectcolab.mppservice.dto.ProjectDTO;
import com.projectcolab.mppservice.service.MppParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MppParserController {

    @Autowired
    private MppParserService mppParserService;

    @PostMapping("/parse")
    public ResponseEntity<?> parseMppFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("No se proporcionó ningún archivo");
            }

            if (!file.getOriginalFilename().endsWith(".mpp")) {
                return ResponseEntity.badRequest().body("El archivo debe ser .mpp");
            }

            ProjectDTO project = mppParserService.parseMppFile(file.getBytes(), file.getOriginalFilename());
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al parsear el archivo: " + e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("MPP Parser Service is running");
    }
}

