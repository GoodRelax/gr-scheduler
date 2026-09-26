# Busy time per thread from a Chrome trace: sum of top-level task durations (toplevel category),
# plus named events of interest. Usage: python analyze-trace.py trace.json [frames]
import json, sys, collections
d = json.load(open(sys.argv[1], encoding='utf-8'))
ev = d['traceEvents'] if isinstance(d, dict) else d
frames = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
names = {}
pnames = {}
for e in ev:
    if e.get('ph') == 'M' and e.get('name') == 'thread_name':
        names[(e['pid'], e['tid'])] = e['args']['name']
    if e.get('ph') == 'M' and e.get('name') == 'process_name':
        pnames[e['pid']] = e['args']['name']
busy = collections.Counter()
count = collections.Counter()
named = collections.Counter()
namedN = collections.Counter()
ts = [e['ts'] for e in ev if 'ts' in e and e.get('ph') in ('X', 'B', 'E')]
span_ms = (max(ts) - min(ts)) / 1000 if ts else 0
WANT = ['RasterTask', 'TileManager::FlushAndIssueSignals', 'GpuRasterization', 'Paint', 'PaintImage', 'UpdateLayoutTree',
        'Layout', 'ParseHTML', 'FunctionCall', 'ProxyMain::BeginMainFrame', 'Scheduler::BeginFrame', 'DrawFrame',
        'Display::DrawAndSwap', 'CommandBufferStub::OnAsyncFlush', 'GLRenderer::DrawFrame', 'SkiaOutputSurfaceImpl::SwapBuffers',
        'LayerTreeHostImpl::PrepareToDraw', 'PictureLayerImpl::UpdateTiles', 'RasterBufferProvider::PlaybackToMemory',
        'Commit', 'PaintArtifactCompositor::Update', 'LocalFrameView::RunPrePaintLifecyclePhase', 'InputHandlerProxy::HandleGestureScroll',
        'EventDispatch', 'HitTest', 'SkiaRenderer::DrawRenderPass', 'SkiaOutputSurfaceImplOnGpu::FinishPaintCurrentFrame',
        'SkiaGpuTraceMemoryDump', 'GrDirectContext::flush', 'SkCanvas::drawPath', 'RasterSource::PlaybackToCanvas']
for e in ev:
    if e.get('ph') != 'X':
        continue
    key = (e['pid'], e['tid'])
    cat = e.get('cat', '')
    dur = e.get('dur', 0) / 1000
    if 'toplevel' in cat.split(',') and e['name'] in ('ThreadControllerImpl::RunTask', 'RunTask', 'ThreadPool_RunTask'):
        busy[key] += dur
        count[key] += 1
    if e['name'] in WANT:
        th = names.get(key, str(key[1]))
        th = ''.join(c for c in th if not c.isdigit())
        named[(th, e['name'])] += dur
        namedN[(th, e['name'])] += 1
print(f'span {span_ms:.0f} ms, frames {frames:.0f}, ms per frame {span_ms / frames:.2f}')
agg = collections.Counter()
aggn = collections.Counter()
for key, v in busy.items():
    th = names.get(key, str(key[1]))
    th = ''.join(c for c in th if not c.isdigit())
    agg[(pnames.get(key[0], '?')[:12], th)] += v
    aggn[(pnames.get(key[0], '?')[:12], th)] += count[key]
print('busy per thread (top-level tasks), ms per frame:')
for k, v in agg.most_common(14):
    print(f'  {k[0]:12s} {k[1]:32s} {v / frames:8.2f}  ({aggn[k]} tasks)')
print('named events, ms per frame:')
for k, v in named.most_common(22):
    print(f'  {k[0]:28s} {k[1]:48s} {v / frames:8.2f}  n={namedN[k]}')
