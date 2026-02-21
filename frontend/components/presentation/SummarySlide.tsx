"use client";

import React from "react";
import { clsx } from "clsx";
import { CheckCircle2, AlertCircle, User, Calendar } from "lucide-react";

interface ActionItem {
  text: string;
  owner: string;
  deadline: string;
}

interface SummarySlideProps {
  situation: string;
  complication: string;
  question: string;
  answer: string;
  actionItems?: ActionItem[];
  revealStep: number;
}

interface SCQAQuadrantProps {
  tag: string;
  label: string;
  content: string;
  bgClass: string;
  tagClass: string;
  borderClass: string;
  revealIndex: number;
  revealStep: number;
}

function SCQAQuadrant({
  tag,
  label,
  content,
  bgClass,
  tagClass,
  borderClass,
  revealIndex,
  revealStep,
}: SCQAQuadrantProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border-2 p-6 flex flex-col gap-3",
        bgClass,
        borderClass
      )}
      style={{
        opacity: revealStep >= revealIndex ? 1 : 0,
        transform: revealStep >= revealIndex ? "scale(1)" : "scale(0.97)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="flex items-center gap-2">
        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", tagClass)}>
          {tag}
        </span>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <p className="text-lg text-slate-800 leading-relaxed flex-1">{content}</p>
    </div>
  );
}

export function SummarySlide({
  situation,
  complication,
  question,
  answer,
  actionItems,
  revealStep,
}: SummarySlideProps) {
  return (
    <div className="flex flex-col h-full gap-5">
      {/* SCQA 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        <SCQAQuadrant
          tag="S"
          label="背景 Situation"
          content={situation}
          bgClass="bg-slate-50"
          tagClass="bg-slate-200 text-slate-700"
          borderClass="border-slate-200"
          revealIndex={1}
          revealStep={revealStep}
        />
        <SCQAQuadrant
          tag="C"
          label="冲突 Complication"
          content={complication}
          bgClass="bg-red-50"
          tagClass="bg-red-100 text-red-700"
          borderClass="border-red-200"
          revealIndex={2}
          revealStep={revealStep}
        />
        <SCQAQuadrant
          tag="Q"
          label="疑问 Question"
          content={question}
          bgClass="bg-amber-50"
          tagClass="bg-amber-100 text-amber-700"
          borderClass="border-amber-200"
          revealIndex={3}
          revealStep={revealStep}
        />
        <SCQAQuadrant
          tag="A"
          label="答案 Answer"
          content={answer}
          bgClass="bg-green-50"
          tagClass="bg-green-100 text-green-700"
          borderClass="border-green-200"
          revealIndex={4}
          revealStep={revealStep}
        />
      </div>

      {/* Action items */}
      {actionItems && actionItems.length > 0 && (
        <div
          className="rounded-xl border border-slate-200 bg-white px-6 py-4"
          style={{
            opacity: revealStep >= 5 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            行动项
          </p>
          <div className="flex flex-col gap-2">
            {actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 text-sm"
              >
                <AlertCircle className="w-4 h-4 text-amber-500 flex-none" />
                <span className="flex-1 text-slate-800 text-base">{item.text}</span>
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <User className="w-3 h-3" />
                  <span>{item.owner}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{item.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
