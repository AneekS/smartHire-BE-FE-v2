import { motion } from "framer-motion";
import { Edit3, Type, Columns, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/useResumeStore";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import type { ParsedResume } from "@/lib/services/ParserService";

function EditableText({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
    // A simple contentEditable span
    return (
        <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
                if (e.target.textContent !== value && e.target.textContent !== null) {
                    onChange(e.target.textContent);
                }
            }}
            className={cn("outline-none focus:ring-2 focus:ring-violet-200 rounded cursor-text px-1 -ml-1 transition-all break-words whitespace-pre-wrap", className)}
        >
            {value}
        </span>
    );
}

export function ResumeEditorPanel() {
    const { originalContent, updatedContent: data, updateSection, improvements } = useResumeStore();
    const [splitView, setSplitView] = useState(false);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const syncingScrollRef = useRef(false);

    const syncScroll = useCallback((source: "left" | "right") => {
        if (syncingScrollRef.current) return;
        const left = leftRef.current;
        const right = rightRef.current;
        if (!left || !right) return;
        syncingScrollRef.current = true;
        const target = source === "left" ? right : left;
        const from = source === "left" ? left : right;
        target.scrollTop = from.scrollTop;
        requestAnimationFrame(() => { syncingScrollRef.current = false; });
    }, []);

    // Derived states
    const isSaving = false; // Add saving logic if needed later
    const suggestions = improvements || [];

    const handleUpdate = (section: string, value: unknown) => {
        updateSection(section, value);
    };

    // Extract which sections have active suggestions
    const sectionHasFix = (secName: string) => {
        return suggestions.some(s => s.section.toLowerCase() === secName.toLowerCase() && !s.applied);
    };

    if (!data) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <p className="text-gray-400">Loading editor...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col gap-4">
            {/* Editor Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <Edit3 className="h-5 w-5 text-violet-600" />
                    <h2 className="font-display font-bold text-lg dark:text-white">Live Resume Editor</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex rounded-2xl bg-gray-100 p-1">
                        <Button
                            variant="ghost"
                            onClick={() => setSplitView(false)}
                            className={cn("h-8 px-4 text-xs font-bold rounded-xl", !splitView ? "bg-white shadow-sm text-violet-600" : "text-gray-500")}
                        >
                            <Type className="w-3.5 h-3.5 mr-2" />
                            Editor
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setSplitView(true)}
                            className={cn("h-8 px-4 text-xs font-bold rounded-xl", splitView ? "bg-white shadow-sm text-violet-600" : "text-gray-500")}
                        >
                            <Columns className="w-3.5 h-3.5 mr-2" />
                            Split View
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-gray-200" />

                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 min-w-24">
                        {isSaving ? (
                            <span className="flex items-center gap-1 text-violet-600">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                            </span>
                        ) : (
                            <span className="flex items-center text-emerald-500 gap-1 fade-in">
                                <Check className="w-3.5 h-3.5" /> All saved
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Editor Document Render */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "relative flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm",
                    !splitView && "p-6 lg:p-10"
                )}
            >
                {splitView && originalContent ? (
                    <>
                        <div
                            ref={leftRef}
                            onScroll={() => syncScroll("left")}
                            className="flex-1 overflow-y-auto thin-scrollbar p-6 border-r border-gray-200 bg-gray-50/80 opacity-90"
                        >
                            <ResumeReadOnlyContent content={originalContent} />
                        </div>
                        <div
                            ref={rightRef}
                            onScroll={() => syncScroll("right")}
                            className="flex-1 overflow-y-auto thin-scrollbar p-6 bg-white"
                        >
                            <ResumeEditableContent data={data} handleUpdate={handleUpdate} sectionHasFix={sectionHasFix} suggestions={suggestions} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto thin-scrollbar p-6 lg:p-10 bg-white min-h-0">
                        <ResumeEditableContent data={data} handleUpdate={handleUpdate} sectionHasFix={sectionHasFix} suggestions={suggestions} />
                    </div>
                )}
            </motion.div>
        </div>
    );
}

function ResumeReadOnlyContent({ content }: { content: ParsedResume }) {
    return (
        <div className="text-gray-600">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black font-display tracking-tight text-gray-800 mb-3">{content.contactInfo.name}</h1>
                <p className="flex flex-wrap justify-center gap-3 text-sm font-medium tracking-wide text-gray-600">
                    {content.contactInfo.location}
                    <span>·</span>
                    {content.contactInfo.email}
                    <span>·</span>
                    {content.contactInfo.phone}
                    <span>·</span>
                    {content.contactInfo.linkedin}
                </p>
            </div>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3 border-b border-violet-200 pb-2">
                    <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Summary</h2>
                </div>
                <p className="text-sm leading-relaxed">{content.summary}</p>
            </div>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-5 border-b border-violet-200 pb-2">
                    <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Experience</h2>
                </div>
                <div className="space-y-6">
                    {content.experience.map((job) => (
                        <div key={job.id}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">{job.title}</h3>
                                    <p className="text-sm font-bold text-gray-500">{job.company}</p>
                                </div>
                                <span className="text-xs uppercase font-bold tracking-widest text-gray-400">{job.startDate} - {job.endDate}</span>
                            </div>
                            <ul className="list-none space-y-2 mt-3 ml-1">
                                {job.bullets.map((b) => (
                                    <li key={b.id} className="flex items-start gap-2">
                                        <span className="text-violet-600/70 mt-1">•</span>
                                        <span className="text-sm leading-relaxed">{b.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                    <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Skills</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {content.skills.map((s) => (
                        <span key={s.id} className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-gray-100 border-gray-200 text-gray-700">{s.name}</span>
                    ))}
                </div>
            </div>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                    <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Education</h2>
                </div>
                <div className="space-y-4">
                    {content.education.map((edu) => (
                        <div key={edu.id} className="flex justify-between items-start">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                                <p className="text-xs font-bold text-gray-500">{edu.institution}</p>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{edu.startDate} - {edu.endDate}</span>
                        </div>
                    ))}
                </div>
            </div>
            {content.projects?.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                        <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Projects</h2>
                    </div>
                    <div className="space-y-6">
                        {content.projects.map((proj) => (
                            <div key={proj.id}>
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">{proj.name}</h3>
                                        {(proj.techStack?.length ?? 0) > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {proj.techStack!.map((t, i) => (
                                                    <span key={i} className="text-xs bg-violet-100 text-violet-700 rounded px-2 py-0.5">{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {(proj.startDate || proj.endDate) && (
                                        <span className="text-xs uppercase font-bold tracking-widest text-gray-400">{proj.startDate ?? ""} {proj.endDate ? `– ${proj.endDate}` : ""}</span>
                                    )}
                                </div>
                                {proj.description && <p className="text-sm text-gray-600 mb-2">{proj.description}</p>}
                                <ul className="list-none space-y-2 ml-1">
                                    {proj.bullets.map((b) => (
                                        <li key={b.id} className="flex items-start gap-2">
                                            <span className="text-violet-600/70 mt-1">•</span>
                                            <span className="text-sm leading-relaxed">{b.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResumeEditableContent({
    data,
    handleUpdate,
    sectionHasFix,
    suggestions,
}: {
    data: ParsedResume;
    handleUpdate: (section: string, value: unknown) => void;
    sectionHasFix: (sec: string) => boolean;
    suggestions: { id: string; section: string; originalText?: string; applied?: boolean }[];
}) {
    return (
        <>
                {/* Contact Header */}
                <div className="text-center mb-10 relative z-10">
                    <h1 className="text-4xl font-black font-display tracking-tight text-gray-900 mb-3">
                        <EditableText
                            value={data.contactInfo.name}
                            onChange={v => handleUpdate("contactInfo", { ...data.contactInfo, name: v })}
                        />
                    </h1>
                    <div className="flex flex-wrap justify-center items-center gap-3 text-sm text-gray-600 font-medium tracking-wide">
                        <EditableText value={data.contactInfo.location} onChange={v => handleUpdate("contactInfo", { ...data.contactInfo, location: v })} />
                        <span>•</span>
                        <EditableText value={data.contactInfo.email} onChange={v => handleUpdate("contactInfo", { ...data.contactInfo, email: v })} />
                        <span>•</span>
                        <EditableText value={data.contactInfo.phone} onChange={v => handleUpdate("contactInfo", { ...data.contactInfo, phone: v })} />
                        <span>•</span>
                        <EditableText value={data.contactInfo.linkedin} onChange={v => handleUpdate("contactInfo", { ...data.contactInfo, linkedin: v })} />
                    </div>
                </div>

                {/* Professional Summary */}
                <div id="resume-section-summary" className={cn("mb-8 relative transition-all duration-1000 rounded-lg", sectionHasFix("summary") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-3 border-b border-violet-200 pb-2">
                        <div className="w-1.5 h-5 bg-violet-500 rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Summary</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">
                        <EditableText
                            value={data.summary}
                            onChange={v => handleUpdate("summary", v)}
                            className="block w-full"
                        />
                    </p>
                </div>

                {/* Experience Section */}
                <div id="resume-section-experience" className={cn("mb-8 relative transition-all duration-1000 rounded-lg", sectionHasFix("experience") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-5 border-b border-violet-200 pb-2">
                        <div className="w-1.5 h-5 bg-violet-500 rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Experience</h2>
                    </div>

                    <div className="space-y-6">
                        {data.experience.map((job, jIdx) => (
                            <div key={job.id} className="relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">
                                            <EditableText
                                                value={job.title}
                                                onChange={v => {
                                                    const newExp = [...data.experience];
                                                    newExp[jIdx].title = v;
                                                    handleUpdate("experience", newExp);
                                                }}
                                            />
                                        </h3>
                                        <p className="text-sm font-bold text-gray-500">
                                            <EditableText
                                                value={job.company}
                                                onChange={v => {
                                                    const newExp = [...data.experience];
                                                    newExp[jIdx].company = v;
                                                    handleUpdate("experience", newExp);
                                                }}
                                            />
                                        </p>
                                    </div>
                                    <span className="text-xs uppercase font-bold tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                        <EditableText
                                            value={`${job.startDate} - ${job.endDate}`}
                                            onChange={v => {
                                                const newExp = [...data.experience];
                                                const [start, end] = v.split("-").map(s => s.trim());
                                                newExp[jIdx].startDate = start || '';
                                                newExp[jIdx].endDate = end || '';
                                                handleUpdate("experience", newExp);
                                            }}
                                        />
                                    </span>
                                </div>

                                <ul className="list-none space-y-2 mt-3 ml-1">
                                    {job.bullets.map((bullet, bIdx) => {
                                        const hasFix = suggestions.find(s => !s.applied && s.originalText && bullet.text.includes(s.originalText));

                                        return (
                                            <li key={bullet.id || bIdx} className="relative flex items-start gap-2 group/bullet">
                                                <span className="text-violet-600/70 mt-1">•</span>
                                                <div className={cn(
                                                    "text-sm text-gray-700 flex-1 leading-relaxed rounded-md px-1 transition-all duration-300",
                                                    hasFix ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-gray-50"
                                                )}>
                                                    <EditableText
                                                        value={bullet.text}
                                                        onChange={v => {
                                                            const newExp = [...data.experience];
                                                            newExp[jIdx].bullets[bIdx].text = v;
                                                            handleUpdate("experience", newExp);
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Skills Section */}
                <div id="resume-section-skills" className={cn("mb-8 relative transition-all duration-1000 rounded-lg", sectionHasFix("skills") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                        <div className="w-1.5 h-5 bg-violet-500 rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Skills</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.skills.map((skill, sIdx) => {
                            const hasFix = suggestions.find(s => !s.applied && s.originalText === skill.name);
                            return (
                                <div
                                    key={skill.id || sIdx}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors",
                                        hasFix
                                            ? "bg-amber-500/10 border-amber-500 text-amber-600"
                                            : "bg-gray-100 border-gray-200 text-gray-700"
                                    )}
                                >
                                    <EditableText
                                        value={skill.name}
                                        onChange={v => {
                                            const newSkills = [...data.skills];
                                            newSkills[sIdx].name = v;
                                            handleUpdate("skills", newSkills);
                                        }}
                                    />
                                </div>
                            );
                        })}
                        <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] rounded-xl border-dashed">
                            + Add Skill
                        </Button>
                    </div>
                </div>

                {/* Education Section */}
                <div id="resume-section-education" className="mb-8 rounded-lg">
                    <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                        <div className="w-1.5 h-5 bg-violet-500 rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Education</h2>
                    </div>
                    <div className="space-y-4">
                        {data.education.map((edu, eIdx) => (
                            <div key={edu.id || eIdx} className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        <EditableText value={edu.degree} onChange={v => {
                                            const newEdu = [...data.education];
                                            newEdu[eIdx].degree = v;
                                            handleUpdate("education", newEdu);
                                        }} />
                                    </h3>
                                    <p className="text-xs font-bold text-gray-500">
                                        <EditableText value={edu.institution} onChange={v => {
                                            const newEdu = [...data.education];
                                            newEdu[eIdx].institution = v;
                                            handleUpdate("education", newEdu);
                                        }} />
                                    </p>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                    <EditableText value={`${edu.startDate} - ${edu.endDate}`} onChange={v => {
                                        const newEdu = [...data.education];
                                        const [start, end] = v.split("-").map(s => s.trim());
                                        newEdu[eIdx].startDate = start || '';
                                        newEdu[eIdx].endDate = end || '';
                                        handleUpdate("education", newEdu);
                                    }} />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Projects Section */}
                {(data.projects?.length ?? 0) > 0 && (
                    <div id="resume-section-projects" className={cn("mb-8 rounded-lg", sectionHasFix("projects") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                        <div className="flex items-center gap-2 mb-4 border-b border-violet-200 pb-2">
                            <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">Projects</h2>
                        </div>
                        <div className="space-y-6">
                            {data.projects.map((proj, pIdx) => (
                                <div key={proj.id} className="relative group">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">
                                                <EditableText
                                                    value={proj.name}
                                                    onChange={v => {
                                                        const next = [...(data.projects ?? [])];
                                                        next[pIdx] = { ...next[pIdx], name: v };
                                                        handleUpdate("projects", next);
                                                    }}
                                                />
                                            </h3>
                                            {(proj.techStack?.length ?? 0) > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {proj.techStack!.map((t, tIdx) => (
                                                        <span key={tIdx} className="text-xs bg-violet-100 text-violet-700 rounded px-2 py-0.5">{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {(proj.startDate || proj.endDate) && (
                                            <span className="text-xs uppercase font-bold tracking-widest text-gray-400">
                                                <EditableText
                                                    value={`${proj.startDate ?? ""}${proj.endDate ? ` - ${proj.endDate}` : ""}`}
                                                    onChange={v => {
                                                        const next = [...(data.projects ?? [])];
                                                        const [start, ...rest] = v.split("-").map(s => s.trim());
                                                        next[pIdx] = { ...next[pIdx], startDate: start ?? "", endDate: rest.join(" - ") ?? "" };
                                                        handleUpdate("projects", next);
                                                    }}
                                                />
                                            </span>
                                        )}
                                    </div>
                                    {proj.description && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            <EditableText value={proj.description} onChange={v => {
                                                const next = [...(data.projects ?? [])];
                                                next[pIdx] = { ...next[pIdx], description: v };
                                                handleUpdate("projects", next);
                                            }} />
                                        </p>
                                    )}
                                    <ul className="list-none space-y-2 ml-1">
                                        {proj.bullets.map((bullet, bIdx) => (
                                            <li key={bullet.id} className="flex items-start gap-2">
                                                <span className="text-violet-600/70 mt-1">•</span>
                                                <EditableText
                                                    value={bullet.text}
                                                    onChange={v => {
                                                        const next = [...(data.projects ?? [])];
                                                        next[pIdx] = {
                                                            ...next[pIdx],
                                                            bullets: next[pIdx].bullets.map((b, i) => i === bIdx ? { ...b, text: v } : b),
                                                        };
                                                        handleUpdate("projects", next);
                                                    }}
                                                    className="text-sm flex-1"
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
        </>
    );
}
