import { Fragment, type CSSProperties } from "react";

const LETTER_STAGGER_MS = 30;
const LINE_STAGGER_S = 0.4;
const PARAGRAPH_EXTRA_DELAY_S = 0.2;

const LINE_BASE =
  "mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mx-0 lg:text-7xl";

export type HeroLine = {
  text: string;
  highlight?: boolean;
  delay?: number;
};

/**
 * Línea de titular cuyas letras entran en cascada al montarse.
 * `delay` (en segundos) desplaza el inicio de la línea dentro del cascade.
 */
function AnimatedHeading({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  let letterIndex = 0;
  return (
    <h1 aria-label={text} className={className}>
      {words.map((word, wordIndex) => {
        const letters = Array.from(word).map((letter) => {
          const style: CSSProperties = {
            animationDelay: `${delay + (letterIndex++ * LETTER_STAGGER_MS) / 1000}s`,
          };
          return { letter, style };
        });
        return (
          <Fragment key={wordIndex}>
            {wordIndex > 0 ? " " : null}
            <span className="inline-block whitespace-nowrap" aria-hidden="true">
              {letters.map((item, index) => (
                <span
                  key={index}
                  className="inline-block animate-fade-up"
                  style={item.style}
                >
                  {item.letter}
                </span>
              ))}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
}

/**
 * Bloque hero reutilizable (Login, Register, ...): líneas de titular con
 * entrada de letras en cascada + párrafo descriptivo con fade-in.
 * El texto se pasa por props; los delays se derivan del índice de cada línea
 * salvo que se indiquen explícitamente.
 */
export function HeroHeading({
  lines,
  description,
}: {
  lines: HeroLine[];
  description: string;
}) {
  const lastDelay = (lines.length - 1) * LINE_STAGGER_S;
  return (
    <div className="text-center lg:text-left">
      {lines.map((line, index) => (
        <AnimatedHeading
          key={`${index}-${line.text}`}
          text={line.text}
          delay={line.delay ?? index * LINE_STAGGER_S}
          className={`${LINE_BASE}${line.highlight ? " text-mint" : ""}`}
        />
      ))}
      <p
        className="animate-fade-up mx-auto mt-6 max-w-xl text-center text-base leading-7 text-slate-400 sm:text-lg sm:leading-8 lg:mx-0 lg:text-left"
        style={{ animationDelay: `${lastDelay + PARAGRAPH_EXTRA_DELAY_S}s` }}
      >
        {description}
      </p>
    </div>
  );
}
