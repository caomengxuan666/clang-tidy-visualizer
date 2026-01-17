# Clang-Tidy Visualizer - Project Rules Documentation

## 🎯 General Etiquette

## Language Requirements

- All code and comments must be developed in English for internationalization

### Code Style & Quality

- Prioritize clean and easy-to-understand code that new members can quickly comprehend
- Avoid over-engineering; solve problems in the simplest way possible without predicting future requirements

### Function Design Principles

1. Functions should be small (no more than 50 lines)
2. Functions should be reusable (extract common logic)
3. Avoid duplicate code (abstract after three repetitions)

### Modular Design

- **Single Responsibility Principle**: Each module should do one thing and do it well
- **Dependency Inversion**: High-level modules should not depend on low-level modules; both should depend on abstractions
- **Open/Closed Principle**: Open for extension, closed for modification

### Communication & Collaboration

- Use plain language, avoid jargon: Explain code using easy-to-understand language
- Diagrams first: Complex logic must have flowcharts (mermaid style)
- Full understanding: Read all relevant code before making changes or explanations
- Minimal modifications: Only change what's necessary, don't touch unrelated modules

### Verification & Testing

- Must verify after changes: Consider at least 10 typical scenarios and provide expected results
- Charts must be usable: Mermaid diagrams should have correct syntax and be clear in dark theme

## 🔍 Architecture Design Rules

### Core Principles

```mermaid
flowchart TD
    A[Received Bug Report] --> B[Reproduce Problem]
    B --> C[Analyze Related Code]
    C --> D[Confirm Impact Scope]
    D --> E[Write Problem Understanding Report]
```

### Module Division Rules

- Layered Architecture: UI Layer ↔ Business Layer ↔ Data Layer
- Unidirectional Data Flow: User Operation → Business Processing → Interface Update
- Event-Driven: Use VSCode event system to avoid direct coupling

## 🐛 Bug Fixing Process Rules

### 1. Understand the Problem

Must answer these questions:

- Which users does this issue affect?
- Under what conditions does it occur?
- Is there a workaround?

### 2. Analyze the Cause

At least two possible causes:

- Surface cause: Direct conditions triggering the bug
- Root cause: System design or logical flaws

Analysis tools:

- Code review
- Log analysis
- Debugging with breakpoints

### 3. Make a Plan

```mermaid
flowchart TD
    A[Develop Fix Plan] --> B{Verification Method}
    B -->|Unit Test| C[Write Test Cases]
    B -->|Integration Test| D[Set Up Test Environment]
    B -->|Manual Test| E[Prepare Test Data]
    
    C --> F[Implement Fix]
    D --> F
    E --> F
    
    F --> G[Verify Fix Effect]
    G --> H[Ensure No Side Effects]
```

Fix plan requirements:

- Modify minimal code
- Don't introduce new bugs
- Have a rollback plan

### 4. Request Confirmation

Before submitting for review:

- Explain the fix idea
- Describe the modification scope
- Estimate risk level
- Request team confirmation

### 5. Execute the Fix

Follow these when coding:

```mermaid
graph LR
    A[Start Fix] --> B[Write Tests]
    B --> C[Modify Code]
    C --> D[Run Tests]
    D --> E{Tests Pass?}
    E -->|Yes| F[Code Review]
    E -->|No| B
    F --> G{Review Pass?}
    G -->|Yes| H[Submit Code]
    G -->|No| C
```

### 6. Review

Self-review checklist:

- Does the code comply with standards?
- Are there performance issues?
- Are there security risks?
- Is test coverage sufficient?
- Does documentation need updating?

### 7. Explain

Must include:

- Root cause: What caused the bug
- Fix solution: How the problem was solved
- Impact scope: Which modules were modified
- Test results: How the fix was verified
- Follow-up suggestions: How to avoid similar issues

## 📊 Testing Rules

### Test Case Requirements

```mermaid
flowchart TD
    A[Test Case Design] --> B[Positive Cases]
    A --> C[Negative Cases]
    A --> D[Boundary Cases]
    A --> E[Exception Cases]
    
    B --> F{Coverage Check}
    C --> F
    D --> F
    E --> F
    
    F --> G[Coverage > 80%]
    G --> H[Pass Test]
```

### 10 Must-Test Scenarios

1. Empty project: No compilation database
2. Single file: Simple C++ file
3. Multiple files: Including headers and source files
4. Third-party libraries: Including third_party directory
5. Misconfiguration: Wrong clang-tidy path
6. Large project: Over 100 files
7. Parallel execution: Multi-threading enabled
8. Fix mode: Using -fix parameter
9. Custom checks: Specifying specific checks
10. Incremental analysis: Analyzing only modified files

## 🎨 UI/UX Design Rules

### State Design Principles

```mermaid
stateDiagram-v2
    [*] --> Ready
    Ready --> Analyzing: Click Run
    Analyzing --> Completed: Analysis Successful
    Analyzing --> Failed: Analysis Error
    Completed --> ViewReport: Click View
    Completed --> Ready: Re-analyze
    Failed --> Ready: Retry
    ViewReport --> Ready: Close Report
```

### Feedback Mechanism Requirements

- Progress feedback: Long operations must have progress indicators
- Error feedback: Clearly tell users the problem cause and solution
- Success feedback: Inform users of operation results and next steps

## 🔄 MCP Interactive Feedback Rules

### Mandatory Call Rules

- Any interaction must call: Inquiry, response, and completion of phase tasks
- Must adjust based on feedback: Immediately adjust behavior based on user feedback
- Unless explicitly ended: Only stop calling when user says "end"

### Feedback Loop Process

```mermaid
sequenceDiagram
    participant U as User
    participant A as AI Assistant
    participant M as MCP Feedback System
    
    U->>A: Initiate Request
    A->>M: Call mcp-feedback-enhanced
    M->>U: Request Feedback
    U->>M: Provide Feedback
    M->>A: Return Feedback
    A->>U: Respond Based on Feedback
    
    loop Until Explicitly Ended
        U->>A: Continue Interaction
        A->>M: Call Again
        M->>U: Request Feedback
        U->>M: Provide Feedback
        M->>A: Return Feedback
        A->>U: Adjusted Response
    end
```

### Phase Task Checkpoints

```mermaid
gantt
    title Task Execution and Feedback Checkpoints
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Task Phases
    Requirement Understanding :crit, 00:00, 5m
    Solution Design :00:05, 10m
    Code Implementation :00:15, 20m
    Test Verification :00:35, 10m
    
    section Feedback Checkpoints
    Checkpoint 1 :00:05, 0m
    Checkpoint 2 :00:15, 0m
    Checkpoint 3 :00:35, 0m
    Final Confirmation :00:45, 0m
```

Each checkpoint must:

- Call MCP to request feedback
- Adjust direction based on feedback
- Confirm user satisfaction

## 📁 Project-Specific Rules

### Clang-Tidy Integration Rules

- Zero Python dependencies: All functions implemented in TypeScript
- Multi-format support: JSON preferred, text parsing as alternative
- Parallel processing: Multi-threading for large projects, single-threading for small projects
- Incremental analysis: Support analyzing only changed files

### Report Generation Rules

- Dark theme compatibility: All diagrams must be clearly visible in dark theme
- Interactive design: Support click-throughs, filtering
- Performance first: Large reports load paginated to avoid lag

### Configuration Management Rules

```mermaid
graph LR
    A[Default Configuration] --> B{User Configuration}
    B -->|Yes| C[Merge Configurations]
    B -->|No| A
    
    C --> D[Validate Configuration]
    D --> E{Configuration Valid?}
    E -->|Yes| F[Use Configuration]
    E -->|No| G[Use Default + Warning]
```

## 🚨 Emergency Handling Rules

### Critical Bug Handling Process

```mermaid
flowchart TD
    A[Critical Bug Found] --> B[Immediate Impact Assessment]
    B --> C{Impact Scope}
    C -->|Core Functionality| D[Immediate Fix]
    C -->|Secondary Functionality| E[Scheduled Fix]
    
    D --> F[Quick Fix]
    F --> G[Emergency Testing]
    G --> H[Immediate Release]
    
    E --> I[Scheduled Fix]
    I --> J[Regular Process]
```

### Zero Tolerance for Security Vulnerabilities

- Security vulnerabilities must be addressed immediately
- Must have a solution within 24 hours
- Must be fixed and released within 48 hours

## 📝 Documentation Rules

### Code Comment Requirements

```typescript
/**
 * Execute Clang-Tidy analysis
 * 
 * @param files - List of files to analyze
 * @param options - Analysis options
 * @returns Analysis results and report
 * 
 * @example
 * ```typescript
 * const result = await runner.analyze(['main.cpp'], { checks: '*' });
 * ```
 * 
 * @throws {ClangTidyError} When clang-tidy execution fails
 * @throws {ParseError} When output parsing fails
 */
async function analyze(files: string[], options: Options): Promise<Result> {
  // Implementation code
}
```

### Project Documentation Structure

```
docs/
├── ARCHITECTURE.md     # Architecture design
├── API.md             # API documentation
├── DEVELOPMENT.md     # Development guide
├── TESTING.md         # Testing guide
└── DEPLOYMENT.md      # Deployment guide
```

## ✅ Final Check List

Check before each submission:

- [ ] Code complies with all standards
- [ ] All tests pass
- [ ] Documentation has been updated
- [ ] MCP feedback completed
- [ ] No side effects
- [ ] Performance is acceptable
- [ ] Compatibility verified

Remember: Quality is the team's responsibility, and every member is a quality guardian!
