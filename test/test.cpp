// Test file for Clang-Tidy Visualizer
#include <iostream>
#include <vector>
#include <memory>

using namespace std;

class TestClass {
public:
  TestClass() { cout << "Constructor called" << endl; }

  ~TestClass() { cout << "Destructor called" << endl; }

  void doSomething() {
    int unusedVar = 42; // Warning: unused variable
    cout << "Doing something" << endl;
  }

  int divide(int a, int b) {
    return a / b; // Warning: division by zero possible
  }

  void memoryLeak() {
    int *ptr = new int[10]; // Warning: memory leak
    // Missing delete[] ptr;
  }
  
  // Violates google-explicit-constructor
  TestClass(int value) { } // Should have explicit
  
  // Violates google-readability-casting
  void badCasting() {
    double val = 3.14;
    int converted = (int)val; // C-style cast, should use static_cast
  }
  
  // Violates cppcoreguidelines-narrowing-conversions
  void narrowingConversion() {
    int x = 3.14; // Narrowing conversion
  }
  
  // Violates modernize-use-nullptr
  void useNullptr() {
    int* ptr = NULL; // Should use nullptr
  }
  
  // Violates modernize-use-override
  virtual void someMethod() { } // Should use override if overriding
};

// Violates misc-unconventional-assign-operator
TestClass& operator+(const TestClass& other) {  // Non-const return for assignment operator
    return *this;
}

int main() {
  TestClass obj;

  vector<int> numbers;
  numbers.push_back(1);
  numbers.push_back(2);
  numbers.push_back(3);

  for (int i = 0; i <= numbers.size(); i++) { // Warning: potential out-of-bounds access
    cout << numbers[i] << endl;
  }

  int x = 5;
  int y = x; 

  obj.doSomething();
  obj.memoryLeak();
  
  // More violations
  int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory
  free(raw_ptr);
  
  // Bad unique ptr array usage that triggers bugprone-unique-ptr-array-mismatch
  std::unique_ptr<int> bad_unique_ptr(new int[10]); // Should be unique_ptr<int[]> 

  return 0;
}
