// Test file with basic syntax issues

#include <iostream>
#include <vector>

using namespace std;  // Bad practice: using namespace std

int main() {
    int x = 10;
    int y = 20;
    int z = x + y;  // Unused variable
    
    cout << "Hello World!" << endl;
    
    for (int i = 0; i < 10; i++) {  // Should use ++i instead of i++
        cout << i << endl;
    }
    
    char* str = "Hello";  // Should use const char*
    
    if (x = y) {  // Assignment instead of equality
        cout << "x equals y" << endl;
    }
    
    int arr[10];
    for (int i = 0; i <= 10; i++) {  // Off-by-one error
        arr[i] = i;
    }
    
    return 0;
}
