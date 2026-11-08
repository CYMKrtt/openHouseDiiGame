import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:{...process.env,M3_TEST_DIST_DIR:'.next-test',APP_ORIGIN:'http://127.0.0.1:3100',NEXT_PUBLIC_SESSION_MODE:process.env.NEXT_PUBLIC_SESSION_MODE || 'mock'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{child.kill(signal)});
child.on('exit',code=>process.exit(code ?? 1));
