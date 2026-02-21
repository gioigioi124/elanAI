import { useEffect, useRef, useState, useCallback } from "react";

const QUOTES = [
  "Zzzzz... tao đang bận.",
  "Mày nhìn gì vậy?",
  "Đây là vùng lãnh thổ của tao!",
  "Có cơm không mày?",
  "Tao đã đậu ở đây 3 tiếng rồi đó.",
  "Mày có biết 1 con ruồi có 4000 mắt không?",
  "Đừng xua tao đi, tao ghét nhất cái đó.",
  "Màn hình mày ấm lắm, tao thích.",
  "Tao không phải gián nhé, phân biệt giùm cái.",
  "Zzz... à tao chưa ngủ đâu.",
  "Mày định đập tao à? Thử đi.",
  "Tao bay đẹp hơn Flappy Bird nhiều.",
  "Thức ăn của mày đâu hết rồi?",
  "Nhà vệ sinh mày ở đâu vậy?",
  "Tao đã ghé 47 căn nhà hôm nay.",
];

const FLY_SIZE = 48;

export default function AnnoyingFly() {
  const posRef = useRef({ x: 200, y: 200 });
  const velRef = useRef({ vx: 1.5, vy: 1.5 });
  const stateRef = useRef("flying"); // 'flying' | 'leaving' | 'entering' | 'hidden'
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const flyRef = useRef(null);

  const [visible, setVisible] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [quote, setQuote] = useState("");
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });

  const scheduleLeave = useCallback(() => {
    const delay = 3000 + Math.random() * 5000;
    setTimeout(() => {
      if (stateRef.current !== "flying") return;
      stateRef.current = "leaving";
      const edge = Math.floor(Math.random() * 4);
      const v = velRef.current;
      if (edge === 0) {
        v.vx = -6;
        v.vy = (Math.random() - 0.5) * 2;
      } else if (edge === 1) {
        v.vx = 6;
        v.vy = (Math.random() - 0.5) * 2;
      } else if (edge === 2) {
        v.vy = -6;
        v.vx = (Math.random() - 0.5) * 2;
      } else {
        v.vy = 6;
        v.vx = (Math.random() - 0.5) * 2;
      }
    }, delay);
  }, []);

  const scheduleReturn = useCallback(() => {
    setTimeout(
      () => {
        const p = posRef.current;
        const v = velRef.current;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          p.x = -FLY_SIZE;
          p.y = Math.random() * H;
          v.vx = 4 + Math.random() * 2;
          v.vy = (Math.random() - 0.5) * 3;
        } else if (edge === 1) {
          p.x = W + 10;
          p.y = Math.random() * H;
          v.vx = -(4 + Math.random() * 2);
          v.vy = (Math.random() - 0.5) * 3;
        } else if (edge === 2) {
          p.y = -FLY_SIZE;
          p.x = Math.random() * W;
          v.vy = 4 + Math.random() * 2;
          v.vx = (Math.random() - 0.5) * 3;
        } else {
          p.y = H + 10;
          p.x = Math.random() * W;
          v.vy = -(4 + Math.random() * 2);
          v.vx = (Math.random() - 0.5) * 3;
        }
        stateRef.current = "entering";
        setVisible(true);
      },
      2000 + Math.random() * 4000,
    );
  }, []);

  useEffect(() => {
    posRef.current = {
      x: Math.random() * (window.innerWidth - 100) + 50,
      y: Math.random() * (window.innerHeight - 100) + 50,
    };
    scheduleLeave();

    const loop = (ts) => {
      if (ts - lastTimeRef.current > 16) {
        lastTimeRef.current = ts;

        // Dừng di chuyển khi đang hover hoặc pause
        if (!pausedRef.current) {
          const p = posRef.current;
          const v = velRef.current;
          const W = window.innerWidth;
          const H = window.innerHeight;

          if (stateRef.current === "flying") {
            v.vx += (Math.random() - 0.5) * 0.9;
            v.vy += (Math.random() - 0.5) * 0.9;
            const speed = Math.hypot(v.vx, v.vy);
            if (speed > 3.5) {
              v.vx = (v.vx / speed) * 3.5;
              v.vy = (v.vy / speed) * 3.5;
            }
            if (speed < 0.5) {
              v.vx *= 1.5;
              v.vy *= 1.5;
            }
            if (p.x < 20) v.vx = Math.abs(v.vx);
            if (p.x > W - FLY_SIZE - 10) v.vx = -Math.abs(v.vx);
            if (p.y < 20) v.vy = Math.abs(v.vy);
            if (p.y > H - FLY_SIZE - 10) v.vy = -Math.abs(v.vy);
            p.x += v.vx;
            p.y += v.vy;
          } else if (stateRef.current === "leaving") {
            p.x += v.vx;
            p.y += v.vy;
            if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) {
              stateRef.current = "hidden";
              setVisible(false);
              scheduleReturn();
            }
          } else if (stateRef.current === "entering") {
            v.vx *= 0.97;
            v.vy *= 0.97;
            p.x += v.vx;
            p.y += v.vy;
            if (
              p.x > 20 &&
              p.x < W - FLY_SIZE &&
              p.y > 20 &&
              p.y < H - FLY_SIZE
            ) {
              stateRef.current = "flying";
              scheduleLeave();
            }
          }

          if (flyRef.current) {
            flyRef.current.style.left = p.x + "px";
            flyRef.current.style.top = p.y + "px";
            flyRef.current.style.transform =
              v.vx < 0 ? "scaleX(-1)" : "scaleX(1)";
          }

          const p2 = posRef.current;
          const W2 = window.innerWidth;
          setBubblePos({
            x:
              p2.x + FLY_SIZE + 8 > W2 - 260 ? p2.x - 260 : p2.x + FLY_SIZE + 8,
            y: p2.y - 10,
          });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scheduleLeave, scheduleReturn]);

  const handleMouseEnter = () => {
    setHovering(true);
    pausedRef.current = true;
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  };
  const handleMouseLeave = () => {
    setHovering(false);
    // Chỉ bỏ pause do hover nếu không đang click-paused
    if (!paused) pausedRef.current = false;
  };
  const handleClick = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next || hovering;
    if (!next && !hovering) setQuote("");
    else setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  };

  if (!visible) return null;

  return (
    <>
      {/* Con ruồi */}
      <div
        ref={flyRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="fixed z-[9999] cursor-pointer select-none"
        style={{ width: FLY_SIZE, height: FLY_SIZE }}
      >
        <FlySVG paused={paused || hovering} />
      </div>

      {/* Bong bóng thoại */}
      {(hovering || paused) && (
        <div
          className="fixed z-[10000] pointer-events-none px-3 py-2 rounded-xl rounded-bl-sm text-xs leading-snug max-w-[220px] shadow-lg border border-indigo-700/60 bg-slate-800/95 text-cyan-200 transition-opacity duration-150"
          style={{ left: bubblePos.x, top: bubblePos.y }}
        >
          {quote}
          {paused && (
            <span className="block mt-1 text-yellow-300 text-[10px]">
              📌 Click để bay tiếp
            </span>
          )}
        </div>
      )}
    </>
  );
}

/* SVG con ruồi tách riêng cho gọn */
function FlySVG({ paused }) {
  const wingStyle = (side) => ({
    transformOrigin: side === "L" ? "10px 22px" : "30px 22px",
    animation: paused ? "none" : `wing${side} 0.06s linear infinite alternate`,
  });

  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-md"
    >
      {/* Cánh trái */}
      <ellipse
        cx="10"
        cy="16"
        rx="9"
        ry="6"
        fill="rgba(180,220,255,0.40)"
        stroke="rgba(150,200,255,0.55)"
        strokeWidth="0.5"
        style={wingStyle("L")}
      />
      {/* Cánh phải */}
      <ellipse
        cx="30"
        cy="16"
        rx="9"
        ry="6"
        fill="rgba(180,220,255,0.40)"
        stroke="rgba(150,200,255,0.55)"
        strokeWidth="0.5"
        style={wingStyle("R")}
      />
      {/* Thân */}
      <ellipse
        cx="20"
        cy="23"
        rx="6"
        ry="9"
        fill="#222"
        stroke="#555"
        strokeWidth="0.4"
      />
      <ellipse cx="20" cy="23" rx="3" ry="5" fill="#333" opacity="0.6" />
      {/* Đầu */}
      <circle
        cx="20"
        cy="13"
        r="5"
        fill="#1a1a1a"
        stroke="#444"
        strokeWidth="0.4"
      />
      {/* Mắt đỏ */}
      <circle cx="17.5" cy="12" r="2.5" fill="#cc0000" />
      <circle cx="22.5" cy="12" r="2.5" fill="#cc0000" />
      <circle cx="17" cy="11.5" r="0.8" fill="#ff7777" />
      <circle cx="22" cy="11.5" r="0.8" fill="#ff7777" />
      {/* Râu */}
      <line x1="17" y1="9" x2="13" y2="6" stroke="#555" strokeWidth="0.8" />
      <line x1="23" y1="9" x2="27" y2="6" stroke="#555" strokeWidth="0.8" />

      <style>{`
        @keyframes wingL {
          from { transform: scaleY(1)   rotate(-12deg); opacity: 0.7; }
          to   { transform: scaleY(0.5) rotate(4deg);  opacity: 0.35; }
        }
        @keyframes wingR {
          from { transform: scaleY(1)   rotate(12deg);  opacity: 0.7; }
          to   { transform: scaleY(0.5) rotate(-4deg);  opacity: 0.35; }
        }
      `}</style>
    </svg>
  );
}
