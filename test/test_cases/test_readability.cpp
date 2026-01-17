// Test file with readability issues

#include <iostream>
#include <string>
#include <vector>

// Function with too many parameters
void complexFunction(int a, int b, int c, int d, int e, int f, int g, int h) {
    // Too many parameters makes the function hard to read
    std::cout << a + b + c + d + e + f + g + h << std::endl;
}

// Function that is too long
void longFunction() {
    int x = 1;
    int y = 2;
    int z = x + y;
    
    if (x > 0) {
        if (y > 0) {
            if (z > 0) {
                std::cout << "All positive" << std::endl;
            } else {
                std::cout << "z is not positive" << std::endl;
            }
        } else {
            std::cout << "y is not positive" << std::endl;
        }
    } else {
        std::cout << "x is not positive" << std::endl;
    }
    
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            for (int k = 0; k < 10; k++) {
                std::cout << i * j * k << std::endl;
            }
        }
    }
}

// Magic numbers without explanation
void magicNumbers() {
    int array[1024];  // What's special about 1024?
    
    for (int i = 0; i < 1024; i++) {
        array[i] = i * 256;  // What's special about 256?
    }
}

// Poorly formatted code
void poorFormatting() {
    int a=1,b=2,c=3;if(a>b)if(b>c)std::cout<<"a>b>c"<<std::endl;else std::cout<<"a>b<=c"<<std::endl;else std::cout<<"a<=b"<<std::endl;
}

// Unclear variable names
void unclearNames() {
    int x = 10;  // What does x represent?
    int y = 20;  // What does y represent?
    int z = x + y;  // What does z represent?
    
    std::cout << z << std::endl;
}

// Nested ternary operators
void nestedTernary() {
    int a = 1, b = 2, c = 3, d = 4;
    int result = a > b ? (c > d ? c : d) : (a > c ? a : c);
    
    std::cout << result << std::endl;
}

int main() {
    complexFunction(1, 2, 3, 4, 5, 6, 7, 8);
    longFunction();
    magicNumbers();
    poorFormatting();
    unclearNames();
    nestedTernary();
    
    return 0;
}
