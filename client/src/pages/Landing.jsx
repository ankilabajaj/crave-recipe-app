import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  Sparkles,
  Heart,
  CalendarDays,
  Search,
} from "lucide-react";
import { FoodImage, Reveal } from "../components/Shared";
export default function Landing() {
  const hero = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame;
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        hero.current?.style.setProperty(
          "--scroll",
          Math.min(window.scrollY / window.innerHeight, 1),
        ),
      );
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <>
      <section className="hero" ref={hero}>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="little-line" /> Good food. Great days.
            </p>
            <h1>
              Welcome
              <br />
              to <em>Crave.</em>
            </h1>
            <p className="hero-subtitle">
              Discover what you love.
              <br />
              Cook what you crave.
            </p>
            <Link className="button" to="/auth?mode=signup">
              Find your next favorite <ArrowUpRight size={20} />
            </Link>
            <p className="quiet">
              A world of recipes. A kitchen that’s all yours.
            </p>
          </div>
          <div className="hero-art">
            <div className="orange-disc" />
            <FoodImage
              className="hero-food"
              src="https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg"
              alt="A colorful freshly prepared dish, ready to share"
              width="640"
              height="640"
            />
            <span className="food-sticker">
              <Sparkles size={25} />
              <span>
                Made for
                <br />
                <strong>your cravings.</strong>
              </span>
            </span>
            <span className="round-stamp">
              A little more joy
              <br />
              in every bite ✳
            </span>
          </div>
        </div>
        <a className="scroll-hint" href="#about">
          <ArrowDown size={17} /> A taste of what’s inside
        </a>
        <span className="hero-number" aria-hidden="true">
          01 / GOOD FOOD STARTS HERE
        </span>
      </section>
      <div className="ticker" aria-hidden="true">
        <span>DISCOVER SOMETHING DELICIOUS</span> ✳{" "}
        <span>SAVE WHAT YOU LOVE</span> ✳ <span>MAKE ROOM FOR GOOD FOOD</span> ✳
      </div>
      <section id="about" className="about-section wrap">
        <Reveal className="collage">
          <FoodImage
            className="collage-main"
            src="https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg"
            alt="A generous bowl of homemade food"
            loading="lazy"
            width="500"
            height="540"
          />
          <FoodImage
            className="collage-small"
            src="https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg"
            alt="A delicious recipe to inspire your next meal"
            loading="lazy"
            width="280"
            height="280"
          />
          <span className="collage-note">
            Less “what’s for dinner?”
            <br />
            More “that was delicious.”
          </span>
        </Reveal>
        <Reveal className="about-copy">
          <p className="eyebrow">A pinch of inspiration</p>
          <h2>
            Your kitchen,
            <br />
            your cravings,
            <br />
            <em>your way.</em>
          </h2>
          <p>
            Crave brings delicious recipes, your favorite dishes, and weekly
            meal planning together in one simple place. Less wondering what to
            cook, more enjoying what you make.
          </p>
          <div className="feature-list">
            <span>
              <Search /> Discover your next favorite
            </span>
            <span>
              <Heart /> Keep the recipes you love
            </span>
            <span>
              <CalendarDays /> Make your week delicious
            </span>
          </div>
          <Link className="text-link" to="/auth?mode=signup">
            Meet your new kitchen companion <ArrowUpRight size={19} />
          </Link>
        </Reveal>
      </section>
      <section className="join-section">
        <Reveal className="wrap">
          <p className="eyebrow">Your next delicious chapter</p>
          <span className="join-spark" aria-hidden="true">
            ✳
          </span>
          <h2>
            Something delicious
            <br />
            is <em>waiting.</em>
          </h2>
          <p>Ready to find your next favorite recipe?</p>
          <div className="button-row">
            <Link className="button dark" to="/auth?mode=signup">
              Get started <ArrowUpRight size={19} />
            </Link>
            <Link className="button outline dark-outline" to="/auth?mode=login">
              Log in
            </Link>
          </div>
          <p className="quiet">Free to explore. Easy to love.</p>
        </Reveal>
      </section>
    </>
  );
}
