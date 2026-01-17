// Test file with performance issues

#include <iostream>
#include <memory>
#include <string>
#include <vector>


// Inefficient loop with string concatenation
std::string inefficientStringConcat() {
  std::string result;
  for (int i = 0; i < 1000; ++i) {
    result += "string" + std::to_string(i);
  }
  return result;
}

// Unnecessary copies
void unnecessaryCopies() {
  std::vector<int> largeVector(1000000, 0);

  // Unnecessary copy of large vector
  std::vector<int> copy = largeVector;

  // Should pass by const reference instead of value
  printVector(copy);
}

// Pass by value instead of const reference
void printVector(std::vector<int> vec) {
  for (const auto &val : vec) {
    std::cout << val << " ";
  }
  std::cout << std::endl;
}

// Use of raw pointers instead of smart pointers
void rawPointerUsage() {
  // Potential memory leak
  int *data = new int[1000];

  // Missing delete[]
  // delete[] data;
}

// Inefficient use of vector
void inefficientVectorUsage() {
  std::vector<int> vec;

  // No reserve, causes multiple reallocations
  for (int i = 0; i < 1000000; ++i) {
    vec.push_back(i);
  }
}

// Premature optimization with complex expressions
int prematureOptimization(int a, int b, int c) {
  // Complex expression that's harder to read
  return (a + b) * (c - a) / (b + c) % (a * c);
}

// Excessive branching
int excessiveBranching(int x) {
  if (x < 0) {
    return -1;
  } else if (x == 0) {
    return 0;
  } else if (x == 1) {
    return 1;
  } else if (x == 2) {
    return 2;
  } else if (x == 3) {
    return 3;
  } else {
    return x;
  }
}

// Use of C-style arrays
void cStyleArrays() {
  int arr[1000];
  for (int i = 0; i < 1000; ++i) {
    arr[i] = i;
  }

  // C-style array passed to function
  processArray(arr, 1000);
}

void processArray(int *arr, int size) {
  for (int i = 0; i < size; ++i) {
    arr[i] *= 2;
  }
}

int main() {
  inefficientStringConcat();
  unnecessaryCopies();
  rawPointerUsage();
  inefficientVectorUsage();
  prematureOptimization(1, 2, 3);
  excessiveBranching(5);
  cStyleArrays();

  return 0;
}
