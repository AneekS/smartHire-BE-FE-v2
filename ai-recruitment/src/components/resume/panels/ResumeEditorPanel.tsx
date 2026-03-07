import { motion, AnimatePresence } from "framer-motion";
import { CopyPlus, Edit3, Type, Columns, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, ResumeData } from "../EditorContext";
import { Button } from "@/components/ui/button";

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
            className={cn("outline-none focus:ring-2 focus:ring-primary/20 rounded cursor-text px-1 -ml-1 transition-all break-words whitespace-pre-wrap", className)}
        >
            {value}
        </span>
    );
}

export function ResumeEditorPanel() {
    const { data, updateData, isSaving, splitView, setSplitView, suggestions } = useEditor();

    const handleUpdate = (section: keyof ResumeData, value: any) => {
        updateData(section, value);
    };

    // Extract which sections have active suggestions
    const sectionHasFix = (secName: string) => {
        return suggestions.some(s => s.section.toLowerCase() === secName.toLowerCase() && !s.applied);
    };

    return (
        <div className="w-full h-full flex flex-col gap-4">
            {/* Editor Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between glass-panel px-6 py-4 rounded-3xl"
            >
                <div className="flex items-center gap-3">
                    <Edit3 className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold text-lg dark:text-white">Live Resume Editor</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <Button
                            variant="ghost"
                            onClick={() => setSplitView(false)}
                            className={cn("h-8 px-4 text-xs font-bold rounded-xl", !splitView ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-500")}
                        >
                            <Type className="w-3.5 h-3.5 mr-2" />
                            Editor
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setSplitView(true)}
                            className={cn("h-8 px-4 text-xs font-bold rounded-xl", splitView ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-500")}
                        >
                            <Columns className="w-3.5 h-3.5 mr-2" />
                            Split View
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 min-w-24">
                        {isSaving ? (
                            <span className="flex items-center text-primary gap-1 fade-in">
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
                className="glass-panel flex-1 rounded-3xl p-6 lg:p-10 overflow-y-auto thin-scrollbar bg-white dark:bg-[#111116] border shadow-xl relative min-w-0"
            >
                {splitView && (
                    <div className="absolute top-0 right-0 h-full w-1/2 bg-rose-50/50 dark:bg-rose-950/10 border-l border-slate-200 dark:border-slate-800 pointer-events-none opacity-50 z-0"></div>
                )}

                {/* Contact Header */}
                <div className="text-center mb-10 relative z-10">
                    <h1 className="text-4xl font-black font-display tracking-tight text-slate-900 dark:text-white mb-3">
                        <EditableText
                            value={data.contact.name}
                            onChange={v => handleUpdate("contact", { ...data.contact, name: v })}
                        />
                    </h1>
                    <div className="flex flex-wrap justify-center items-center gap-3 text-sm text-slate-600 dark:text-slate-400 font-medium tracking-wide">
                        <EditableText value={data.contact.location} onChange={v => handleUpdate("contact", { ...data.contact, location: v })} />
                        <span>•</span>
                        <EditableText value={data.contact.email} onChange={v => handleUpdate("contact", { ...data.contact, email: v })} />
                        <span>•</span>
                        <EditableText value={data.contact.phone} onChange={v => handleUpdate("contact", { ...data.contact, phone: v })} />
                        <span>•</span>
                        <EditableText value={data.contact.linkedin} onChange={v => handleUpdate("contact", { ...data.contact, linkedin: v })} />
                    </div>
                </div>

                {/* Professional Summary */}
                <div className={cn("mb-8 relative transition-all duration-1000", sectionHasFix("summary") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Summary</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <EditableText
                            value={data.summary}
                            onChange={v => handleUpdate("summary", v)}
                            className="block w-full"
                        />
                    </p>
                </div>

                {/* Experience Section */}
                <div className={cn("mb-8 relative transition-all duration-1000", sectionHasFix("experience") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-5 border-b border-primary/20 pb-2">
                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Experience</h2>
                    </div>

                    <div className="space-y-6">
                        {data.experience.map((job, jIdx) => (
                            <div key={job.id} className="relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            <EditableText
                                                value={job.title}
                                                onChange={v => {
                                                    const newExp = [...data.experience];
                                                    newExp[jIdx].title = v;
                                                    handleUpdate("experience", newExp);
                                                }}
                                            />
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500">
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
                                    <span className="text-xs uppercase font-bold tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                        <EditableText
                                            value={job.date}
                                            onChange={v => {
                                                const newExp = [...data.experience];
                                                newExp[jIdx].date = v;
                                                handleUpdate("experience", newExp);
                                            }}
                                        />
                                    </span>
                                </div>

                                <ul className="list-none space-y-2 mt-3 ml-1">
                                    {job.bullets.map((bullet, bIdx) => {
                                        // Check if this bullet matches any pending suggestion's suggestedText or originalText
                                        // Wait, the context state replaces it upon fix. Let's just highlight if it's identical to originalText
                                        const hasFix = suggestions.find(s => !s.applied && s.originalText && bullet.includes(s.originalText));

                                        return (
                                            <li key={bIdx} className="relative flex items-start gap-2 group/bullet">
                                                <span className="text-primary/70 mt-1">•</span>
                                                <div className={cn(
                                                    "text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed rounded-md px-1 transition-all duration-300",
                                                    hasFix ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                )}>
                                                    <EditableText
                                                        value={bullet}
                                                        onChange={v => {
                                                            const newExp = [...data.experience];
                                                            newExp[jIdx].bullets[bIdx] = v;
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
                <div className={cn("mb-8 relative transition-all duration-1000", sectionHasFix("skills") ? "shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "")}>
                    <div className="flex items-center gap-2 mb-4 border-b border-primary/20 pb-2">
                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Skills</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.skills.map((skill, sIdx) => {
                            const hasFix = suggestions.find(s => !s.applied && s.originalText === skill);
                            return (
                                <div
                                    key={sIdx}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors",
                                        hasFix
                                            ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                            : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <EditableText
                                        value={skill}
                                        onChange={v => {
                                            const newSkills = [...data.skills];
                                            newSkills[sIdx] = v;
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
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 border-b border-primary/20 pb-2">
                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Education</h2>
                    </div>
                    <div className="space-y-4">
                        {data.education.map((edu, eIdx) => (
                            <div key={edu.id} className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        <EditableText value={edu.degree} onChange={v => {
                                            const newEdu = [...data.education];
                                            newEdu[eIdx].degree = v;
                                            handleUpdate("education", newEdu);
                                        }} />
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500">
                                        <EditableText value={edu.school} onChange={v => {
                                            const newEdu = [...data.education];
                                            newEdu[eIdx].school = v;
                                            handleUpdate("education", newEdu);
                                        }} />
                                    </p>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                    <EditableText value={edu.date} onChange={v => {
                                        const newEdu = [...data.education];
                                        newEdu[eIdx].date = v;
                                        handleUpdate("education", newEdu);
                                    }} />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
