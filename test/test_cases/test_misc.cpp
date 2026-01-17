// Test file with miscellaneous issues

#include <iostream>
#include <vector>
#include <string>
#include <memory>

class Test {
public:
    Test(int value) : value_(value) {
        std::cout << "Test constructor" << std::endl;
    }
    
    ~Test() {
        std::cout << "Test destructor" << std::endl;
    }
    
    int GetValue() const {
        return value_;
    }
    
private:
    int value_;
};

void memoryLeaks() {
    // Memory leak: new without delete
    int* ptr = new int[10];
    
    // Memory leak: new without delete for object
    Test* test = new Test(42);
    
    // Memory leak: shared_ptr cycle
    std::shared_ptr<Test> ptr1 = std::make_shared<Test>(10);
    std::shared_ptr<Test> ptr2 = std::make_shared<Test>(20);
    // Uncomment to create cycle: ptr1->SetNext(ptr2); ptr2->SetNext(ptr1);
}

void unnecessaryCopies() {
    std::string str = "Hello World";
    
    // Unnecessary copy: should use const reference
    std::string copy = str;
    
    // Unnecessary copy in loop
    std::vector<int> vec(1000, 0);
    for (int i = 0; i < vec.size(); i++) {
        int val = vec[i];  // Could use const reference for non-primitive types
    }
}

void incorrectMemoryAccess() {
    int arr[5] = {1, 2, 3, 4, 5};
    
    // Out-of-bounds access
    std::cout << arr[10] << std::endl;
    
    // Null pointer dereference
    Test* ptr = nullptr;
    // std::cout << ptr->GetValue() << std::endl;  // Commented to avoid crash
}

void inefficientCode() {
    // Inefficient string concatenation in loop
    std::string result;
    for (int i = 0; i < 1000; i++) {
        result += "x";
    }
    
    // Inefficient use of vector
    std::vector<int> vec;
    for (int i = 0; i < 1000; i++) {
        vec.push_back(i);
    }
    // Should use reserve upfront
}

int main() {
    memoryLeaks();
    unnecessaryCopies();
    incorrectMemoryAccess();
    inefficientCode();
    
    return 0;
}
