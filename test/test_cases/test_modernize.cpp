// Test file with modern C++ usage issues

#include <iostream>
#include <vector>
#include <string>
#include <memory>
#include <algorithm>

// C++11: Use of raw pointers instead of smart pointers
void rawPointers() {
    int* ptr = new int(42);
    
    std::cout << *ptr << std::endl;
    
    delete ptr;  // Manual memory management
}

// C++11: Use of auto keyword
void noAutoKeyword() {
    std::vector<int> vec = {1, 2, 3, 4, 5};
    
    // Should use auto
    for (std::vector<int>::iterator it = vec.begin(); it != vec.end(); ++it) {
        std::cout << *it << std::endl;
    }
}

// C++11: Range-based for loops
void noRangeBasedFor() {
    int arr[] = {1, 2, 3, 4, 5};
    
    // Should use range-based for loop
    for (int i = 0; i < 5; ++i) {
        std::cout << arr[i] << std::endl;
    }
}

// C++11: nullptr instead of NULL
void useOfNULL() {
    int* ptr = NULL;  // Should use nullptr
    
    if (ptr == NULL) {  // Should use nullptr
        std::cout << "ptr is NULL" << std::endl;
    }
}

// C++11: Use of initializer lists
void noInitializerLists() {
    std::vector<int> vec;
    vec.push_back(1);
    vec.push_back(2);
    vec.push_back(3);
    vec.push_back(4);
    vec.push_back(5);
    
    // Should use initializer list: std::vector<int> vec = {1, 2, 3, 4, 5};
}

// C++14: Use of auto for return type deduction
std::vector<int> createVector() {
    std::vector<int> vec = {1, 2, 3, 4, 5};
    return vec;
}

void noReturnTypeDeduction() {
    std::vector<int> vec = createVector();  // Could use auto
    
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        std::cout << *it << std::endl;
    }
}

// C++17: Use of structured bindings
void noStructuredBindings() {
    std::pair<int, std::string> p = {1, "test"};
    
    // Should use structured bindings: auto [x, s] = p;
    std::cout << p.first << ": " << p.second << std::endl;
}

int main() {
    rawPointers();
    noAutoKeyword();
    noRangeBasedFor();
    useOfNULL();
    noInitializerLists();
    noReturnTypeDeduction();
    noStructuredBindings();
    
    return 0;
}
