import os
import subprocess
import platform
import sys

def init_msvc_env():
    if platform.system() != "Windows":
        print("[WARN] 非 Windows，跳过 MSVC 初始化")
        return os.environ.copy()

    vs_install_path = r"C:\Program Files\Microsoft Visual Studio\18\Community"
    vcvars_path = os.path.join(
        vs_install_path, "VC", "Auxiliary", "Build", "vcvarsall.bat"
    )
    if not os.path.exists(vcvars_path):
        print(f"[WARN] 找不到 vcvarsall.bat: {vcvars_path}，继续尝试运行...")
        return os.environ.copy()

    cmd = f'"{vcvars_path}" x64 && set'
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="gbk",
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        print("[WARN] MSVC 环境初始化超时，继续尝试运行...")
        return os.environ.copy()
    except subprocess.CalledProcessError as e:
        print(f"[WARN] MSVC 初始化失败: {e}, 继续尝试运行...")
        return os.environ.copy()

    env = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            env[key] = value
    return env

def run_command(cmd, env, cwd=None):
    print(f"\n[CMD] {' '.join(map(str, cmd))}")
    try:
        result = subprocess.run(
            cmd,
            shell=False,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            env=env,
            cwd=cwd,
        )
        if result.stdout.strip():
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] 命令失败:\n{e.stdout}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print(f"[ERROR] 找不到命令: {cmd[0]}", file=sys.stderr)
        return False

def main():
    # 初始化MSVC环境
    env = init_msvc_env()
    
    # 配置CMake
    project_root = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(project_root, "build")
    
    # 创建构建目录
    if not os.path.exists(build_dir):
        os.makedirs(build_dir)
    
    # 运行CMake配置
    cmake_path = "cmake"
    config_cmd = [
        cmake_path,
        "-S", project_root,
        "-B", build_dir,
        "-G", "Ninja",
        "-DCMAKE_BUILD_TYPE=Debug",
        "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON",
    ]
    
    print("正在配置CMake...")
    if run_command(config_cmd, env, cwd=project_root):
        print("\nCMake配置成功!")
        
        # 构建项目
        build_cmd = [
            cmake_path,
            "--build", build_dir,
            "--config", "Debug",
        ]
        
        print("\n正在构建项目...")
        if run_command(build_cmd, env, cwd=project_root):
            print("\n项目构建成功!")
            
            # 复制compile_commands.json到项目根目录
            compile_commands_src = os.path.join(build_dir, "compile_commands.json")
            compile_commands_dst = os.path.join(project_root, "compile_commands.json")
            
            if os.path.exists(compile_commands_src):
                try:
                    with open(compile_commands_src, 'r') as f_src, open(compile_commands_dst, 'w') as f_dst:
                        f_dst.write(f_src.read())
                    print("\ncompile_commands.json已复制到项目根目录!")
                except Exception as e:
                    print(f"\n[ERROR] 复制compile_commands.json失败: {e}")
            else:
                print(f"\n[ERROR] 找不到compile_commands.json: {compile_commands_src}")
        else:
            print("\n项目构建失败!")
    else:
        print("\nCMake配置失败!")

if __name__ == "__main__":
    main()