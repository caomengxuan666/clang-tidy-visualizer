// Process Management Utilities
import * as child_process from 'child_process';
import * as os from 'os';
import { logger } from './logger';

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class ProcessUtils {
  /**
   * Execute command and return result
   */
  static async executeCommand(
    command: string,
    args: string[],
    options?: child_process.SpawnOptions
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    
    return new Promise<ProcessResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      const child = child_process.spawn(command, args, {
        ...options,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      });
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
          duration
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Execute multiple commands in parallel
   */
  static async executeParallel(
    tasks: Array<{ command: string; args: string[]; options?: child_process.SpawnOptions }>,
    maxWorkers: number = os.cpus().length,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    const queue = [...tasks];
    const workers = new Set<Promise<void>>();
    let completedTasks = 0;
    const totalTasks = tasks.length;
    
    logger.debug(`Starting parallel execution with ${maxWorkers} workers for ${totalTasks} tasks`);
    logger.debug(`Task list: ${JSON.stringify(tasks.map((task, index) => ({ index, command: task.command, args: task.args.slice(0, 2) })))}`);
    
    const executeNext = async () => {
      while (queue.length > 0) {
        const taskIndex = totalTasks - queue.length;
        const task = queue.shift()!;
        
        try {
          logger.debug(`Executing task ${taskIndex + 1}/${totalTasks}: ${task.command} ${task.args.slice(0, 5).join(' ')}...`);
          const result = await this.executeCommand(task.command, task.args, task.options);
          
          logger.debug(`Task ${taskIndex + 1}/${totalTasks} completed in ${result.duration}ms, exit code: ${result.exitCode}`);
          logger.debug(`Task ${taskIndex + 1}/${totalTasks} stdout length: ${result.stdout.length} chars`);
          if (result.stderr) {
            logger.debug(`Task ${taskIndex + 1}/${totalTasks} stderr: ${result.stderr}`);
          }
          
          results.push(result);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Task ${taskIndex + 1}/${totalTasks} failed: ${errorMsg}`);
          results.push({
            stdout: '',
            stderr: errorMsg,
            exitCode: 1,
            duration: 0
          });
        } finally {
          completedTasks++;
          logger.debug(`Progress: ${completedTasks}/${totalTasks} tasks completed (${Math.round((completedTasks/totalTasks)*100)}%)`);
          
          if (onProgress) {
            onProgress(completedTasks, totalTasks);
          }
        }
      }
    };
    
    // Create specified number of worker processes
    const actualWorkers = Math.min(maxWorkers, tasks.length);
    logger.debug(`Creating ${actualWorkers} worker process(es)`);
    
    for (let i = 0; i < actualWorkers; i++) {
      workers.add(executeNext());
    }
    
    // Wait for all worker processes to complete
    await Promise.all(workers);
    
    logger.debug(`Parallel execution completed. Results: ${results.length} tasks processed`);
    logger.debug(`Results summary: exit codes = [${results.map(r => r.exitCode).join(', ')}]`);
    logger.debug(`Total stdout combined: ${results.reduce((sum, r) => sum + r.stdout.length, 0)} chars`);
    logger.debug(`Total stderr combined: ${results.reduce((sum, r) => sum + r.stderr.length, 0)} chars`);
    
    return results;
  }

  /**
   * Check if command exists
   */
  static async commandExists(command: string): Promise<boolean> {
    try {
      const options: child_process.SpawnOptions = {
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: true
      };
      
      if (process.platform === 'win32') {
        await this.executeCommand('where', [command], options);
      } else {
        await this.executeCommand('which', [command], options);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get CPU core count
   */
  static getCpuCount(): number {
    return os.cpus().length;
  }

  /**
   * Split array into multiple batches
   */
  static splitArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}
