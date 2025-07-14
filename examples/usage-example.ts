import {
  ClaudeCodeAutoSystem,
  ProjectRequest,
  CommandType,
} from '../src/main/ClaudeCodeAutoSystem';

async function demonstrateSystem() {
  console.log('🚀 Starting Claude Code Auto System Demonstration...\n');

  try {
    // Initialize the system
    const system = await ClaudeCodeAutoSystem.create({
      communication: {
        hub_port: 8765,
        heartbeat_interval: 30000,
        message_timeout: 30000,
      },
      auto_scaling: {
        enabled: true,
        min_agents_per_type: {
          architect: 1,
          manager: 1,
          worker: 2,
        },
        max_agents_per_type: {
          architect: 2,
          manager: 3,
          worker: 6,
        },
      },
    });

    console.log('✅ System initialized successfully!\n');

    // Set up event listeners for monitoring
    system.on('project_started', (data) => {
      console.log(`🎯 Project started: ${data.requestId}`);
      console.log(`   Command ID: ${data.commandId}`);
      console.log(`   Requirements: ${data.request.requirements}\n`);
    });

    system.on('project_completed', (data) => {
      console.log(`🎉 Project completed: ${data.requestId}`);
      console.log(`   Duration: ${data.duration}ms`);
      console.log(`   Requirements: ${data.request.requirements}\n`);
    });

    system.on('project_failed', (data) => {
      console.error(`❌ Project failed: ${data.requestId}`);
      console.error(`   Error: ${data.error}\n`);
    });

    system.on('system_metrics_updated', (metrics) => {
      if (metrics.completed_tasks > 0) {
        console.log(`📊 System Metrics Update:`);
        console.log(`   Completed Tasks: ${metrics.completed_tasks}`);
        console.log(`   System Load: ${(metrics.system_load * 100).toFixed(1)}%`);
        console.log(`   Throughput: ${metrics.throughput.toFixed(1)} tasks/hour\n`);
      }
    });

    // Example 1: Analyze existing project
    console.log('📋 Example 1: Analyzing existing project...\n');
    const analysisRequest: ProjectRequest = {
      project_path: '/Users/hashiguchimasaki/project/pomodoro-timer',
      requirements:
        'Analyze the Pomodoro timer application and identify areas for improvement, performance optimization, and code quality enhancements',
      command_type: CommandType.ANALYZE_PROJECT,
      priority: 'high',
      quality_requirements: {
        test_coverage_min: 90,
        documentation_level: 'comprehensive',
      },
    };

    const analysisRequestId = await system.processProject(analysisRequest);
    console.log(`Analysis request submitted: ${analysisRequestId}\n`);

    // Example 2: Implement new feature
    console.log('📋 Example 2: Implementing new feature...\n');
    const featureRequest: ProjectRequest = {
      project_path: '/Users/hashiguchimasaki/project/pomodoro-timer',
      requirements:
        'Add data persistence functionality to save timer sessions, user preferences, and productivity statistics using localStorage and optionally a backend API',
      command_type: CommandType.IMPLEMENT_FEATURE,
      priority: 'medium',
      constraints: {
        time_limit: 7200000, // 2 hours
        resource_constraints: ['no_external_dependencies'],
      },
      quality_requirements: {
        test_coverage_min: 85,
        performance_requirements: ['fast_load_time', 'minimal_memory_usage'],
        security_requirements: ['data_validation', 'xss_protection'],
        documentation_level: 'standard',
      },
    };

    const featureRequestId = await system.processProject(featureRequest);
    console.log(`Feature request submitted: ${featureRequestId}\n`);

    // Example 3: Fix issues and optimize
    console.log('📋 Example 3: Fixing issues and optimizing...\n');
    const optimizationRequest: ProjectRequest = {
      project_path: '/Users/hashiguchimasaki/project/pomodoro-timer',
      requirements:
        'Fix any TypeScript errors, optimize bundle size, improve accessibility, and enhance mobile responsiveness',
      command_type: CommandType.OPTIMIZE_PERFORMANCE,
      priority: 'high',
      quality_requirements: {
        test_coverage_min: 80,
        performance_requirements: ['bundle_size_under_500kb', 'accessibility_aa_compliance'],
        documentation_level: 'minimal',
      },
    };

    const optimizationRequestId = await system.processProject(optimizationRequest);
    console.log(`Optimization request submitted: ${optimizationRequestId}\n`);

    // Monitor system status
    console.log('📊 Monitoring system status...\n');
    const monitoringInterval = setInterval(() => {
      const status = system.getSystemStatus();
      const activeProjects = system.getActiveProjects();

      console.log(`System Status: ${status.status}`);
      console.log(`Active Commands: ${status.active_commands}`);
      console.log(`Active Agents: ${status.active_agents}`);
      console.log(`Active Projects: ${activeProjects.length}`);

      if (activeProjects.length > 0) {
        console.log('Current Projects:');
        activeProjects.forEach((project) => {
          console.log(
            `  - ${project.requestId}: ${project.request.requirements.substring(0, 50)}...`
          );
          console.log(`    Duration: ${Math.round(project.duration / 1000)}s`);
        });
      }
      console.log('');
    }, 10000); // Every 10 seconds

    // Wait for some processing
    await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds

    // Check project statuses
    console.log('🔍 Checking project statuses...\n');

    const analysisStatus = system.getProjectStatus(analysisRequestId);
    if (analysisStatus) {
      console.log(`Analysis Project Status: ${analysisStatus.command?.status || 'Unknown'}`);
      console.log(`Progress: ${analysisStatus.command?.progress || 0}%\n`);
    }

    const featureStatus = system.getProjectStatus(featureRequestId);
    if (featureStatus) {
      console.log(`Feature Project Status: ${featureStatus.command?.status || 'Unknown'}`);
      console.log(`Progress: ${featureStatus.command?.progress || 0}%\n`);
    }

    // Generate comprehensive system report
    console.log('📄 Generating system report...\n');
    const systemReport = system.generateSystemReport();

    console.log('System Report Summary:');
    console.log(`- Uptime: ${Math.round(systemReport.system_info.uptime / 1000)}s`);
    console.log(`- Total Agents: ${systemReport.status.total_agents}`);
    console.log(`- Completed Tasks: ${systemReport.status.completed_tasks}`);
    console.log(`- Failed Tasks: ${systemReport.status.failed_tasks}`);
    console.log(`- Error Rate: ${(systemReport.status.error_rate * 100).toFixed(2)}%`);
    console.log(`- Throughput: ${systemReport.status.throughput.toFixed(2)} tasks/hour`);

    // Wait a bit more to see some results
    await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute

    // Clean up
    clearInterval(monitoringInterval);

    // Demonstrate project cancellation (if any still running)
    const stillActiveProjects = system.getActiveProjects();
    if (stillActiveProjects.length > 0) {
      console.log(`\n🛑 Cancelling remaining active projects...\n`);
      for (const project of stillActiveProjects) {
        try {
          await system.cancelProject(project.requestId);
          console.log(`Cancelled project: ${project.requestId}`);
        } catch (error) {
          console.error(`Failed to cancel project ${project.requestId}:`, error);
        }
      }
    }

    // Final system report
    const finalReport = system.generateSystemReport();
    console.log('\n📄 Final System Report:');
    console.log(JSON.stringify(finalReport, null, 2));

    // Shutdown the system
    console.log('\n🛑 Shutting down system...\n');
    await system.shutdown();
    console.log('✅ System shutdown complete!\n');
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    process.exit(1);
  }
}

// Advanced usage example
async function advancedUsageExample() {
  console.log('🚀 Advanced Usage Example...\n');

  const system = await ClaudeCodeAutoSystem.create({
    orchestrator: {
      max_parallel_tasks: 20,
      task_timeout: 1800000, // 30 minutes
      retry_attempts: 2,
    },
    distribution: {
      strategy: {
        name: 'performance_optimized',
        algorithm: 'performance_based',
        parameters: {
          load_weight: 0.2,
          capability_weight: 0.5,
          performance_weight: 0.3,
        },
      },
      load_balancing_algorithm: 'least_loaded',
    },
    resources: {
      max_concurrent_tasks: 30,
      max_memory_per_process: 4096,
      max_cpu_percentage: 90,
    },
    auto_scaling: {
      enabled: true,
      min_agents_per_type: {
        architect: 2,
        manager: 3,
        worker: 5,
      },
      max_agents_per_type: {
        architect: 4,
        manager: 8,
        worker: 15,
      },
    },
  });

  // Complex multi-project workflow
  const projects = [
    {
      project_path: '/Users/hashiguchimasaki/project/e-commerce-app',
      requirements:
        'Refactor the entire e-commerce application to use microservices architecture, implement GraphQL API, add comprehensive testing, and optimize for performance',
      command_type: CommandType.REFACTOR_CODE,
      priority: 'high' as const,
    },
    {
      project_path: '/Users/hashiguchimasaki/project/blog-platform',
      requirements:
        'Add real-time commenting system, implement content moderation, add SEO optimization, and create admin dashboard',
      command_type: CommandType.IMPLEMENT_FEATURE,
      priority: 'medium' as const,
    },
    {
      project_path: '/Users/hashiguchimasaki/project/analytics-dashboard',
      requirements:
        'Improve security by implementing OAuth2, adding rate limiting, fixing SQL injection vulnerabilities, and adding audit logging',
      command_type: CommandType.IMPROVE_SECURITY,
      priority: 'high' as const,
    },
  ];

  const requestIds = [];
  for (const project of projects) {
    const requestId = await system.processProject(project);
    requestIds.push(requestId);
    console.log(`Submitted project: ${requestId}`);

    // Stagger submissions to show load balancing
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Monitor progress
  const progressMonitor = setInterval(() => {
    console.log('\n📊 Project Progress:');
    for (const requestId of requestIds) {
      const status = system.getProjectStatus(requestId);
      if (status) {
        console.log(
          `${requestId}: ${status.command?.status || 'Unknown'} (${status.command?.progress || 0}%)`
        );
      }
    }

    const systemStatus = system.getSystemStatus();
    console.log(`\nSystem Load: ${(systemStatus.system_load * 100).toFixed(1)}%`);
    console.log(`Active Agents: ${systemStatus.active_agents}`);
    console.log(`Throughput: ${systemStatus.throughput.toFixed(1)} tasks/hour\n`);
  }, 15000);

  // Wait for completion or timeout
  await new Promise((resolve) => setTimeout(resolve, 300000)); // 5 minutes

  clearInterval(progressMonitor);
  await system.shutdown();
}

// Run the demonstration
if (require.main === module) {
  demonstrateSystem()
    .then(() => {
      console.log('🎉 Demonstration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demonstration failed:', error);
      process.exit(1);
    });
}

export { demonstrateSystem, advancedUsageExample };
