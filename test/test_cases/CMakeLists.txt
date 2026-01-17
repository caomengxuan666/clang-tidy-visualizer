cmake_minimum_required(VERSION 3.10)
project(ClangTidyTestCases CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable compile commands database	set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Create executable for test cases
add_executable(test_cases 
    test_basic.cpp
    test_google_style.cpp
    test_misc.cpp
    test_readability.cpp
    test_bugprone.cpp
    test_modernize.cpp
)

# Set compiler warnings
if(MSVC)
    target_compile_options(test_cases PRIVATE /W4 /WX)
else()
    target_compile_options(test_cases PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
