// 프로덕션 환경에서 콘솔 로그 비활성화
if (process.env.NODE_ENV === 'production') {
  // 모든 콘솔 메서드를 빈 함수로 교체
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  console.table = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
  console.groupCollapsed = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
  console.count = () => {};
  console.countReset = () => {};
  console.clear = () => {};
  console.dir = () => {};
  console.dirxml = () => {};
  console.assert = () => {};
  console.profile = () => {};
  console.profileEnd = () => {};
  console.timeStamp = () => {};
  console.timeline = () => {};
  console.timelineEnd = () => {};
  console.markTimeline = () => {};
  console.measure = () => {};
  console.measureEnd = () => {};
  console.takeHeapSnapshot = () => {};
}