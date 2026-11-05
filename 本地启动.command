#!/bin/zsh
# 可从 Finder 双击；引用完整路径，兼容中文和空格。
set -eu
demo_dir="$(cd -- "$(dirname -- "$0")" && pwd -P)"
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$demo_dir/启动.py" "$@"
fi
print -u2 '未找到 Python 3。请在已提供 Python 3 的电脑上运行“启动.py”；网页本身不需要安装任何第三方包。'
read -r 'demo_reply?按回车关闭窗口。'
exit 1
