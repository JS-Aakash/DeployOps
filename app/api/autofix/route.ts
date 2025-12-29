import { NextRequest, NextResponse } from 'next/server';
import { runAutofix } from '@/lib/autofix-service';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    try {
        const body = await req.json();
        const { issueUrl, repoUrl, githubToken, openaiKey } = body;

        const stream = new ReadableStream({
            async start(controller) {
                const sendLog = (data: any) => {
                    const str = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(str));
                };

                try {
                    await runAutofix({
                        issueUrl,
                        repoUrl,
                        githubToken,
                        openaiKey: openaiKey || process.env.API_KEY || '',
                        onLog: (message, level = 'info') => {
                            sendLog({ message, level, timestamp: new Date().toISOString() });
                        }
                    });

                    sendLog({ status: 'SUCCESS', message: 'Autofix completed successfully!' });
                } catch (e: any) {
                    console.error("Autofix Error:", e);
                    sendLog({
                        status: 'FAILED',
                        message: `Error: ${e.message}`,
                        level: 'error'
                    });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
