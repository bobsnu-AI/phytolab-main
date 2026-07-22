// React 훅을 전역 스코프에 노출 (Babel standalone in-browser 컴파일 스크립트들이 공유)
window.useState = React.useState;
window.useEffect = React.useEffect;
window.useMemo = React.useMemo;
window.useRef = React.useRef;
window.useContext = React.useContext;
