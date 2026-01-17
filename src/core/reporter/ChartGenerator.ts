// Chart Generator - Generates Chart.js configurations
import { ClangTidyDiagnostic, ChartConfig } from '../../types';

export class ChartGenerator {
  /**
   * Generate severity distribution chart
   */
  generateSeverityChart(diagnostics: ClangTidyDiagnostic[], isDarkTheme: boolean = false): ChartConfig {
    const counts = this.countBySeverity(diagnostics);
    
    // Create a color map for severity levels
    const severityColors: Record<string, string> = {
      'error': '#FF6384',
      'warning': '#FFCE56',
      'note': '#36A2EB',
      'fatal': '#4BC0C0'
    };
    
    const labels = Object.keys(counts);
    const backgroundColor = labels.map(severity => severityColors[severity] || '#FF6384');
    
    return {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Issues by Severity',
          data: Object.values(counts),
          backgroundColor: backgroundColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Clang-Tidy Issues by Severity',
            color: isDarkTheme ? '#cccccc' : '#2c3e50'
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            },
            backgroundColor: isDarkTheme ? '#3c3c3c' : 'rgba(0, 0, 0, 0.8)',
            titleColor: isDarkTheme ? '#ffffff' : '#000000',
            bodyColor: isDarkTheme ? '#cccccc' : '#000000'
          },
          legend: {
            position: 'top',
            labels: {
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            }
          }
        }
      }
    };
  }

  /**
   * Generate top checks chart
   */
  generateTopChecksChart(diagnostics: ClangTidyDiagnostic[], isDarkTheme: boolean = false): ChartConfig {
    const checkCounts = this.countByCheck(diagnostics);
    const topChecks = Object.entries(checkCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    return {
      type: 'bar',
      data: {
        labels: topChecks.map(([check]) => check.split('.').pop() || check),
        datasets: [{
          label: 'Number of Issues',
          data: topChecks.map(([, count]) => count),
          backgroundColor: isDarkTheme ? '#0e639c' : '#36A2EB',
          borderColor: isDarkTheme ? '#1177bb' : '#2980B9',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Issue Categories',
            color: isDarkTheme ? '#cccccc' : '#2c3e50'
          },
          legend: {
            position: 'right',
            labels: {
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? '#3c3c3c' : 'rgba(0, 0, 0, 0.8)',
            titleColor: isDarkTheme ? '#ffffff' : '#000000',
            bodyColor: isDarkTheme ? '#cccccc' : '#000000'
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Issues',
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            },
            grid: {
              color: isDarkTheme ? '#4a4a4a' : '#e0e0e0'
            },
            ticks: {
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Check Name',
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            },
            grid: {
              color: isDarkTheme ? '#4a4a4a' : '#e0e0e0'
            },
            ticks: {
              color: isDarkTheme ? '#cccccc' : '#2c3e50'
            }
          }
        }
      }
    };
  }

  /**
   * Generate file issues chart
   */
  generateFileIssuesChart(diagnostics: ClangTidyDiagnostic[]): ChartConfig {
    const fileCounts = this.countByFile(diagnostics);
    const topFiles = Object.entries(fileCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    return {
      type: 'bar',
      data: {
        labels: topFiles.map(([file]) => file.split(/[/\\]/).pop() || file),
        datasets: [{
          label: 'Number of Issues',
          data: topFiles.map(([, count]) => count),
          backgroundColor: '#4BC0C0',
          borderColor: '#36A2EB',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Files with Most Issues'
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Issues'
            }
          },
          x: {
            title: {
              display: true,
              text: 'File Name'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };
  }

  /**
   * Count diagnostics by severity
   */
  private countBySeverity(diagnostics: ClangTidyDiagnostic[]): Record<string, number> {
    return diagnostics.reduce((acc, diagnostic) => {
      acc[diagnostic.severity] = (acc[diagnostic.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Count diagnostics by check name
   */
  private countByCheck(diagnostics: ClangTidyDiagnostic[]): Record<string, number> {
    return diagnostics.reduce((acc, diagnostic) => {
      acc[diagnostic.checkName] = (acc[diagnostic.checkName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Count diagnostics by file name
   */
  private countByFile(diagnostics: ClangTidyDiagnostic[]): Record<string, number> {
    return diagnostics.reduce((acc, diagnostic) => {
      acc[diagnostic.filePath] = (acc[diagnostic.filePath] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Generate summary statistics
   */
  generateSummary(diagnostics: ClangTidyDiagnostic[]): any {
    const severityCounts = this.countBySeverity(diagnostics);
    const checkCounts = this.countByCheck(diagnostics);
    const fileCounts = this.countByFile(diagnostics);
    
    return {
      total: diagnostics.length,
      bySeverity: severityCounts,
      byCheck: checkCounts,
      byFile: fileCounts,
      uniqueChecks: Object.keys(checkCounts).length,
      filesWithIssues: Object.keys(fileCounts).length,
      averageIssuesPerFile: diagnostics.length / Object.keys(fileCounts).length || 0
    };
  }
}
