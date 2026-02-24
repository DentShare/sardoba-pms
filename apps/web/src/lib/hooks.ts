'use client';

import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(threshold = 0.1, rootMargin = '0px 0px -50px 0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}

export function useCounter(end: number, duration = 2000, start = 0) {
  const [count, setCount] = useState(start);
  const [isStarted, setIsStarted] = useState(false);
  const { ref, isVisible } = useScrollReveal(0.3);

  useEffect(() => {
    if (!isVisible || isStarted) return;
    setIsStarted(true);

    const startTime = performance.now();
    const range = end - start;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + range * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [isVisible, isStarted, end, duration, start]);

  return { count, ref, isVisible };
}

export function useTypingEffect(
  texts: string[],
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000
) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
          if (displayText.length === currentText.length) {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          setDisplayText(currentText.slice(0, displayText.length - 1));
          if (displayText.length === 0) {
            setIsDeleting(false);
            setTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
      setIsScrolled(scrollTop > 50);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { progress, isScrolled };
}

export function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}

export function useParallax(speed = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    function handleScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrollPosition = window.innerHeight - rect.top;
      if (scrollPosition > 0 && rect.bottom > 0) {
        setOffset(scrollPosition * speed);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset };
}
