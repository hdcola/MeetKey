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
      .once('error', () => {
        tester.destroy();
        resolve(false);
      });
  });
}

/**
 * 启动并监控进程
 */
function spawnAndMonitor(
  command: string,
  args: string[],
  options: any
): { process: ChildProcess; state: { hasExited: boolean } } {
  const state = { hasExited: false };
  const proc = spawn(command, args, options);

  proc.on('exit', (code) => {
    state.hasExited = true;
    if (code !== null && code !== 0) {
      console.error(`❌ Process (${command}) exited prematurely with code ${code}`);
    }
  });

  return { process: proc, state };
}

/**
 * Vitest Global Setup for E2E tests
 */
export default async function () {
  const isServerRunning = await isPortInUse(PORT);

  if (isServerRunning) {
    console.log('🌐 Server is already running on port 8080, skipping spawn.');
    return;
  }

  console.log('🚀 Starting WebSocket server for E2E tests...');

  let monitor = spawnAndMonitor(BINARY_PATH, [], {
    stdio: 'ignore',
    env: { ...process.env, TAURI_DEBUG: '1' },
  });
  serverProcess = monitor.process;

  serverProcess.on('error', (err) => {
    console.warn('⚠️  Failed to start server process binary, attempting "cargo run":', err.message);
    // 如果二进制不存在，尝试 fallback 到 cargo run
    monitor = spawnAndMonitor('cargo', ['run', '--quiet'], {
      cwd: path.resolve(ROOT_DIR, 'packages/center/src-tauri'),
      stdio: 'ignore',
    });
    serverProcess = monitor.process;
  });

  // 等待端口就绪
  try {
    await waitOn({
      resources: [`tcp:127.0.0.1:${PORT}`],
      timeout: 45000, // 增加到 45 秒，cargo run 可能很慢
      interval: 200,
    });

    if (monitor.state.hasExited) {
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
