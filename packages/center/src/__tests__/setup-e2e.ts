import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

let serverProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../../');
// 优先使用编译好的二进制，如果没有则尝试使用 cargo run
const BINARY_PATH = path.resolve(ROOT_DIR, 'packages/center/src-tauri/target/debug/meetkey-center');

export async function setup() {
  console.log('🚀 Starting WebSocket server for E2E tests...');

  // 启动服务器
  serverProcess = spawn(BINARY_PATH, [], {
    stdio: 'ignore', // 忽略输出，避免干扰测试结果
    env: { ...process.env, TAURI_DEBUG: '1' },
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
    // 如果二进制不存在，尝试 fallback 到 cargo run
    console.log('🔄 Attempting fallback to "cargo run"...');
    serverProcess = spawn('cargo', ['run', '--quiet'], {
      cwd: path.resolve(ROOT_DIR, 'packages/center/src-tauri'),
      stdio: 'ignore',
    });
  });

  // 等待 8080 端口就绪
  try {
    await waitOn({
      resources: ['tcp:127.0.0.1:8080'],
      timeout: 10000, // 最多等 10 秒
    });
    console.log('✅ Server is ready at 127.0.0.1:8080');
  } catch (err) {
    console.error('❌ Server failed to start or port 8080 is blocked');
    if (serverProcess) serverProcess.kill();
    throw err;
  }
}

export async function teardown() {
  console.log('🛑 Stopping WebSocket server...');
  if (serverProcess) {
    serverProcess.kill();
    console.log('✅ Server stopped');
  }
}
