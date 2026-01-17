// Test file with Google C++ Style Guide violations

#include <iostream>
#include <string>
#include <vector>

// Bad naming: should be CamelCase
class my_class {
public:
    // Bad naming: should be lowercase with underscores
    int MyVariable;  // Should be my_variable
    
    // Missing explicit return type (void)
    my_class(int value) {
        MyVariable = value;
    }
    
    // Missing virtual destructor for base class
    ~my_class() {
        // Empty destructor
    }
    
    // Bad naming: should be lowercase with underscores
    void MyMethod(int Param1, const std::string &Param2) {
        std::cout << "Value: " << MyVariable << std::endl;
        std::cout << "Param1: " << Param1 << std::endl;
        std::cout << "Param2: " << Param2 << std::endl;
    }
};

// Bad naming: should be CamelCase
void my_function() {
    // Magic number: should use a named constant
    int max_size = 100;
    
    // Bad spacing
    std::vector<int> vec;
    for(int i=0;i<max_size;i++) {
        vec.push_back(i);
    }
    
    // C-style cast: should use static_cast
    double d = 3.14;
    int i = (int)d;
    
    // C-style variable declaration
    int a,b,c;
}

int main() {
    my_class obj(42);
    obj.MyMethod(10, "test");
    
    my_function();
    
    return 0;
}
