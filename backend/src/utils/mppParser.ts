/**
 * Parser para archivos .mpp (Microsoft Project)
 * 
 * IMPORTANTE: Los archivos .mpp son archivos binarios complejos con formato propietario.
 * 
 * Opciones disponibles:
 * 1. Este parser básico (implementado) - extrae información básica del contenido de texto
 * 2. MPXJ (Java) - requiere Java y un wrapper, pero es la solución más completa
 * 3. Servicios comerciales (GroupDocs, Aspose) - costosos pero completos
 * 4. Conversión previa a XML - Microsoft Project puede exportar a XML, más fácil de parsear
 * 
 * Para mejor precisión, se recomienda:
 * - Usar MPXJ a través de un servicio Java separado
 * - O convertir .mpp a XML primero usando Microsoft Project
 */

interface MPPTask {
  name: string;
  startDate?: Date;
  finishDate?: Date;
  duration?: number;
  progress?: number;
  priority?: string;
  notes?: string;
  outlineLevel?: number;
  parentTaskName?: string;
  parentOrder?: number;
}

interface MPPProject {
  name: string;
  startDate?: Date;
  finishDate?: Date;
  tasks: MPPTask[];
}

export async function parseMPPFile(buffer: Buffer): Promise<MPPProject> {
  const tasks: MPPTask[] = [];
  let projectName = 'Proyecto Importado';
  let projectStartDate: Date | undefined;
  let projectFinishDate: Date | undefined;

  try {
    // Los archivos .mpp son archivos binarios complejos
    // Intentamos extraer información de múltiples formas
    
    // Método 1: Buscar texto en formato UTF-16LE (común en archivos de Microsoft)
    let textContent = '';
    try {
      textContent = buffer.toString('utf16le', 0, Math.min(buffer.length, 50000));
    } catch (e) {
      // Si falla UTF-16LE, intentar UTF-8
      textContent = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
    }
    
    // Método 2: También buscar en formato UTF-8
    const utf8Content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
    
    // Combinar ambos contenidos para búsqueda
    const combinedContent = textContent + ' ' + utf8Content;
    
    // Intentar extraer el nombre del proyecto (búsqueda mejorada)
    const namePatterns = [
      /Project[^\x00]{0,100}/i,
      /Title[^\x00]{0,100}/i,
      /Name[^\x00]{0,100}/i,
      /[A-Z][a-zA-Z0-9\s]{5,50}(?=\x00|$)/g,
    ];
    
    for (const pattern of namePatterns) {
      const match = combinedContent.match(pattern);
      if (match && match[0]) {
        const candidate = match[0].replace(/\x00/g, '').trim();
        if (candidate.length > 3 && candidate.length < 100) {
          projectName = candidate;
          break;
        }
      }
    }

    // Buscar fechas en el contenido (múltiples formatos)
    const datePatterns = [
      /(\d{4})[-\/](\d{2})[-\/](\d{2})/g,
      /(\d{2})[-\/](\d{2})[-\/](\d{4})/g,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    ];
    
    const dates: Date[] = [];
    
    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(combinedContent)) !== null) {
        try {
          let date: Date;
          if (match[3] && match[3].length === 4) {
            // Formato YYYY-MM-DD o DD-MM-YYYY
            if (parseInt(match[1]) > 31) {
              // YYYY-MM-DD
              date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
            } else {
              // DD-MM-YYYY o MM-DD-YYYY (asumimos DD-MM-YYYY)
              date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
            }
          } else {
            date = new Date(match[0]);
          }
          
          // Validar que la fecha sea razonable (entre 2000 y 2100)
          if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
            dates.push(date);
          }
        } catch (e) {
          // Ignorar fechas inválidas
        }
      }
    }

    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      projectStartDate = dates[0];
      projectFinishDate = dates[dates.length - 1];
    }

    // Intentar extraer tareas básicas
    // Buscar patrones que puedan indicar nombres de tareas
    const taskPatterns = [
      /Task[^\x00]{5,80}/gi,
      /Tarea[^\x00]{5,80}/gi,
      /[A-Z][a-zA-Z0-9\s]{3,60}(?=\x00|$)/g,
      /[^\x00]{5,60}(?=\x00{2,})/g,
    ];

    const foundTasks = new Set<string>();
    
    for (const pattern of taskPatterns) {
      let taskMatch;
      while ((taskMatch = pattern.exec(combinedContent)) !== null) {
        const taskName = taskMatch[0].replace(/\x00/g, '').trim();
        if (taskName.length > 3 && taskName.length < 100 && !foundTasks.has(taskName)) {
          foundTasks.add(taskName);
          
          // Intentar encontrar fechas asociadas cerca del nombre de la tarea
          const taskStart = taskMatch.index;
          const nearbyText = combinedContent.substring(
            Math.max(0, taskStart - 300),
            Math.min(combinedContent.length, taskStart + 800)
          );
          
          const nearbyDates = nearbyText.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/g);
          let taskStartDate: Date | undefined;
          let taskFinishDate: Date | undefined;
          
          if (nearbyDates && nearbyDates.length >= 2) {
            try {
              const date1 = new Date(nearbyDates[0].replace(/[\/]/g, '-'));
              const date2 = new Date(nearbyDates[1].replace(/[\/]/g, '-'));
              if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
                taskStartDate = date1 < date2 ? date1 : date2;
                taskFinishDate = date1 > date2 ? date1 : date2;
              }
            } catch (e) {
              // Usar fechas del proyecto si no se encuentran específicas
              taskStartDate = projectStartDate;
              taskFinishDate = projectFinishDate;
            }
          } else {
            taskStartDate = projectStartDate;
            taskFinishDate = projectFinishDate;
          }

          // Calcular duración si hay fechas
          let duration: number | undefined;
          if (taskStartDate && taskFinishDate) {
            duration = Math.ceil(
              (taskFinishDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          tasks.push({
            name: taskName,
            startDate: taskStartDate,
            finishDate: taskFinishDate,
            duration: duration || 1,
            progress: 0,
            priority: 'medium',
          });
        }
      }
    }

    // Si no encontramos tareas con patrones, crear tareas básicas basadas en el contenido
    if (tasks.length === 0) {
      // Dividir el contenido en líneas y buscar posibles nombres de tareas
      const lines = textContent.split(/\x00+/).filter(line => line.trim().length > 3);
      
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();
        if (line.length > 3 && line.length < 100 && !line.match(/^\d+$/) && !line.match(/^[^\w]+$/)) {
          const taskStart = projectStartDate || new Date();
          const taskFinish = new Date(taskStart);
          taskFinish.setDate(taskFinish.getDate() + 1);

          tasks.push({
            name: line.substring(0, 50),
            startDate: taskStart,
            finishDate: taskFinish,
            duration: 1,
            progress: 0,
            priority: 'medium',
          });
        }
      }
    }

    // Si aún no hay tareas, crear una tarea por defecto
    if (tasks.length === 0) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      tasks.push({
        name: 'Tarea Importada',
        startDate: today,
        finishDate: tomorrow,
        duration: 1,
        progress: 0,
        priority: 'medium',
      });
    }

  } catch (error) {
    console.error('Error al parsear archivo .mpp:', error);
    // Crear proyecto básico en caso de error
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    tasks.push({
      name: 'Tarea Importada',
      startDate: today,
      finishDate: tomorrow,
      duration: 1,
      progress: 0,
      priority: 'medium',
    });
  }

  return {
    name: projectName,
    startDate: projectStartDate,
    finishDate: projectFinishDate,
    tasks: tasks.slice(0, 100), // Limitar a 100 tareas máximo
  };
}

