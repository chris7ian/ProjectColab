package com.projectcolab.mppservice.service;

import com.projectcolab.mppservice.dto.ProjectDTO;
import com.projectcolab.mppservice.dto.TaskDTO;
import net.sf.mpxj.ProjectFile;
import net.sf.mpxj.mpp.MPPReader;
import net.sf.mpxj.Task;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class MppParserService {

    public ProjectDTO parseMppFile(byte[] fileBytes, String fileName) throws Exception {
        MPPReader reader = new MPPReader();
        ByteArrayInputStream inputStream = new ByteArrayInputStream(fileBytes);
        ProjectFile projectFile = reader.read(inputStream);

        ProjectDTO projectDTO = new ProjectDTO();
        
        // Información del proyecto
        projectDTO.setName(projectFile.getProjectProperties().getProjectTitle() != null 
            ? projectFile.getProjectProperties().getProjectTitle() 
            : fileName.replace(".mpp", ""));
        
        Object startDateObj = projectFile.getProjectProperties().getStartDate();
        Object finishDateObj = projectFile.getProjectProperties().getFinishDate();
        
        if (startDateObj != null) {
            if (startDateObj instanceof Date) {
                projectDTO.setStartDate(convertToLocalDateTime((Date) startDateObj));
            } else if (startDateObj instanceof LocalDateTime) {
                projectDTO.setStartDate((LocalDateTime) startDateObj);
            }
        }
        if (finishDateObj != null) {
            if (finishDateObj instanceof Date) {
                projectDTO.setFinishDate(convertToLocalDateTime((Date) finishDateObj));
            } else if (finishDateObj instanceof LocalDateTime) {
                projectDTO.setFinishDate((LocalDateTime) finishDateObj);
            }
        }

        // Parsear tareas con jerarquía
        List<TaskDTO> tasks = new ArrayList<>();
        java.util.Map<Task, Integer> taskOrderMap = new java.util.HashMap<>();
        int order = 0;

        // Primera pasada: crear mapa de tareas a order
        for (Task task : projectFile.getTasks()) {
            if (task != null && task.getName() != null && !task.getName().trim().isEmpty()) {
                taskOrderMap.put(task, order++);
            }
        }

        // Segunda pasada: crear DTOs con información de jerarquía
        order = 0;
        for (Task task : projectFile.getTasks()) {
            if (task == null || task.getName() == null || task.getName().trim().isEmpty()) {
                continue;
            }

            TaskDTO taskDTO = new TaskDTO();
            taskDTO.setName(task.getName());
            taskDTO.setOrder(order++);
            
            // Nivel de indentación (outline level)
            if (task.getOutlineLevel() != null) {
                taskDTO.setOutlineLevel(task.getOutlineLevel().intValue());
            } else {
                taskDTO.setOutlineLevel(1); // Por defecto nivel 1 (raíz)
            }
            
            // Información del padre
            Task parentTask = task.getParentTask();
            if (parentTask != null && parentTask.getName() != null) {
                taskDTO.setParentTaskName(parentTask.getName());
                // Obtener el order del padre del mapa
                Integer parentOrder = taskOrderMap.get(parentTask);
                if (parentOrder != null) {
                    taskDTO.setParentOrder(parentOrder);
                }
            }
            
            if (task.getNotes() != null) {
                taskDTO.setDescription(task.getNotes());
            }

            // Fechas
            Object taskStartObj = task.getStart();
            Object taskFinishObj = task.getFinish();
            if (taskStartObj != null) {
                if (taskStartObj instanceof Date) {
                    taskDTO.setStartDate(convertToLocalDateTime((Date) taskStartObj));
                } else if (taskStartObj instanceof LocalDateTime) {
                    taskDTO.setStartDate((LocalDateTime) taskStartObj);
                }
            }
            if (taskFinishObj != null) {
                if (taskFinishObj instanceof Date) {
                    taskDTO.setFinishDate(convertToLocalDateTime((Date) taskFinishObj));
                } else if (taskFinishObj instanceof LocalDateTime) {
                    taskDTO.setFinishDate((LocalDateTime) taskFinishObj);
                }
            }

            // Duración
            if (task.getDuration() != null) {
                taskDTO.setDuration(task.getDuration().getDuration() / (1000.0 * 60 * 60 * 24)); // Convertir a días
            }

            // Progreso (0-100)
            Number percentageComplete = task.getPercentageComplete();
            if (percentageComplete != null) {
                taskDTO.setProgress(percentageComplete.intValue());
            } else {
                taskDTO.setProgress(0);
            }

            // Estado
            if (percentageComplete != null && percentageComplete.intValue() >= 100) {
                taskDTO.setStatus("completed");
            } else if (task.getActualStart() != null) {
                taskDTO.setStatus("in_progress");
            } else {
                taskDTO.setStatus("todo");
            }

            // Prioridad
            net.sf.mpxj.Priority priority = task.getPriority();
            if (priority != null) {
                int priorityValue = priority.getValue();
                if (priorityValue >= 900) {
                    taskDTO.setPriority("urgent");
                } else if (priorityValue >= 700) {
                    taskDTO.setPriority("high");
                } else if (priorityValue >= 500) {
                    taskDTO.setPriority("medium");
                } else {
                    taskDTO.setPriority("low");
                }
            } else {
                taskDTO.setPriority("medium");
            }

            tasks.add(taskDTO);
        }

        projectDTO.setTasks(tasks);
        return projectDTO;
    }

    private LocalDateTime convertToLocalDateTime(Date date) {
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}

