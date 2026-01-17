// Test file with bug-prone code patterns

#include <iostream>
#include <string>
#include <vector>

// Bug-prone: assignment in condition
void assignmentInCondition() {
    int x = 10;
    int y = 20;
    
    if (x = y) {  // Oops! Assignment instead of equality
        std::cout << "x is true" << std::endl;
    }
}

// Bug-prone: using pointer after delete
void useAfterDelete() {
    int* ptr = new int(42);
    delete ptr;
    
    // Using pointer after delete
    std::cout << *ptr << std::endl;  // Undefined behavior
}

// Bug-prone: incorrect deallocation
void incorrectDeallocation() {
    int* ptr = new int[10];
    delete ptr;  // Should be delete[]
}

// Bug-prone: off-by-one error
void offByOneError() {
    int arr[5] = {1, 2, 3, 4, 5};
    
    // Loop runs from 0 to 5 (inclusive), but array only has indexes 0-4
    for (int i = 0; i <= 5; ++i) {
        std::cout << arr[i] << std::endl;  // Out-of-bounds access
    }
}

// Bug-prone: uninitialized variable
void uninitializedVariable() {
    int x;
    
    // Using uninitialized variable
    std::cout << x << std::endl;  // Undefined behavior
}

// Bug-prone: null pointer dereference
void nullPointerDereference() {
    int* ptr = nullptr;
    
    // Dereferencing null pointer
    *ptr = 42;  // Undefined behavior
}

// Bug-prone: integer overflow
void integerOverflow() {
    int max = 2147483647;
    int overflow = max + 1;  // Undefined behavior
    
    std::cout << "Overflow result: " << overflow << std::endl;
}

// Bug-prone: mixing signed and unsigned
void mixingSignedUnsigned() {
    int signedInt = -1;
    unsigned int unsignedInt = 1;
    
    // Comparison between signed and unsigned
    if (signedInt < unsignedInt) {
        std::cout << "-1 < 1" << std::endl;
    } else {
        std::cout << "-1 >= 1" << std::endl;  // This will be true due to promotion
    }
}

int main() {
    assignmentInCondition();
    // useAfterDelete();  // Commented to avoid crash
    incorrectDeallocation();
    offByOneError();
    uninitializedVariable();
    // nullPointerDereference();  // Commented to avoid crash
    integerOverflow();
    mixingSignedUnsigned();
    
    return 0;
}
