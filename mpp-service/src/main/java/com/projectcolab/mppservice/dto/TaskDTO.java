package com.projectcolab.mppservice.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TaskDTO {
    private String name;
    private String description;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime finishDate;
    
    private Double duration; // en días
    private Integer progress; // 0-100
    private String status; // todo, in_progress, completed, blocked
    private String priority; // low, medium, high, urgent
    private Integer order;
    private Integer outlineLevel; // Nivel de indentación (1 = raíz, 2 = hijo, etc.)
    private String parentTaskName; // Nombre de la tarea padre (para referencia)
    private Integer parentOrder; // Order de la tarea padre (para referencia)
}

