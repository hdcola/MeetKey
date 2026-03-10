import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';
import net from 'net';

let serverProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const PORT = 8080;
// 优先使用编译好的二进制，如果没有则尝试使用 cargo run
const BINARY_NAME = process.platform === 'win32' ? 'meetkey-center.exe' : 'meetkey-center';
const BINARY_PATH = path.resolve(ROOT_DIR, 'packages/center/src-tauri/target/debug', BINARY_NAME);

/**
 * 检查端口是否被占用 (true = 占用, false = 空闲)
 */
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .connect(port, '127.0.0.1')
      .once('connect', () => {
        tester.destroy();
        resolve(true);
      })
      .once('error', (err: any) => {
        tester.destroy();
        resolve(false);
      });
  });
}

/**
 * Vitest Global Setup for E2E tests
 */
export default async function () {
  const isServerRunning = await isPortInUse(PORT);

  if (isServerRunning) {
    console.log('🌐 Server is already running on port 8080, skipping spawn.');
    // 如果服务器已经运行，我们不返回 teardown，这样就不会意外杀掉用户的开发环境进程
    return;
  }

  console.log('🚀 Starting WebSocket server for E2E tests...');

  // 启动服务器
  serverProcess = spawn(BINARY_PATH, [], {
    stdio: 'ignore', // 忽略输出，避免干扰测试结果
    env: { ...process.env, TAURI_DEBUG: '1' },
  });

  // 监控进程退出，实现快速失败
  let hasExited = false;
  serverProcess.on('exit', (code) => {
    hasExited = true;
    if (code !== null && code !== 0) {
      console.error(`❌ Server process exited prematurely with code ${code}`);
    }
  });

  serverProcess.on('error', (err) => {
    console.warn('⚠️  Failed to start server process binary, attempting "cargo run":', err.message);
    // 如果二进制不存在，尝试 fallback 到 cargo run
    serverProcess = spawn('cargo', ['run', '--quiet'], {
      cwd: path.resolve(ROOT_DIR, 'packages/center/src-tauri'),
      stdio: 'ignore',
    });
  });

  // 等待端口就绪
  try {
    await waitOn({
      resources: [`tcp:127.0.0.1:${PORT}`],
      timeout: 30000, // 增加到 30 秒，适配慢速构建环境
      simultaneousInterval: 100, // 检查频率
    });

    if (hasExited) {
      throw new Error('Server process exited before port became ready');
    }

    console.log('✅ Server is ready at 127.0.0.1:8080');
  } catch (err) {
    console.error('❌ Server failed to start or port 8080 is blocked');
    if (serverProcess) serverProcess.kill();
    throw err;
  }

  // 返回 teardown 函数供 Vitest 调用
  return async () => {
    if (serverProcess) {
      console.log('🛑 Stopping WebSocket server...');
      serverProcess.kill();
      console.log('✅ Server stopped');
    }
  };
}
