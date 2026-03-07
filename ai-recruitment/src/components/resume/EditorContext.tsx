import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useResumes } from "@/hooks";

export type SuggestionType = "CRITICAL" | "IMPROVEMENT" | "OPTIMIZATION";

export interface AI_Suggestion {
    id: string;
    type: SuggestionType;
    section: string;
    title: string;
    description: string;
    applied: boolean;
    originalText?: string;
    suggestedText?: string;
}

export interface AppliedFix {
    id: string;
    suggestionId: string;
    section: string;
    originalText: string;
    newText: string;
    appliedAt: Date;
    source: "ai" | "manual";
}

export interface ChangeLogEntry {
    id: string;
    timestamp: Date;
    section: string;
    description: string;
    fixId: string;
}

export interface ResumeData {
    contact: {
        name: string;
        email: string;
        phone: string;
        location: string;
        linkedin: string;
    };
    summary: string;
    experience: Array<{
        id: string;
        title: string;
        company: string;
        date: string;
        bullets: string[];
    }>;
    skills: string[];
    education: Array<{
        id: string;
        degree: string;
        school: string;
        date: string;
    }>;
}

interface EditorContextType {
    data: ResumeData;
    originalData: ResumeData;
    updateData: (section: keyof ResumeData, value: any) => void;
    suggestions: AI_Suggestion[];
    applySuggestion: (id: string, newText: string) => void;
    ignoreSuggestion: (id: string) => void;
    applyAllSuggestions: () => void;
    undoFix: (fixId: string) => void;
    undoAll: () => void;
    appliedFixes: AppliedFix[];
    changeLog: ChangeLogEntry[];
    atsScore: number;
    isSaving: boolean;
    splitView: boolean;
    setSplitView: (val: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Dummy fallback data if the API parsed data is empty
const defaultResume: ResumeData = {
    contact: {
        name: "Alex Developer",
        email: "alex@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/alexdev"
    },
    summary: "Results-driven Software Engineer with 4+ years of experience building scalable web applications. Proficient in React, Node.js, and TypeScript. Passionate about AI integrations and performance optimization.",
    experience: [
        {
            id: "exp-1",
            title: "Senior Frontend Engineer",
            company: "TechCorp Inc.",
            date: "Jan 2021 - Present",
            bullets: [
                "Led the frontend team in migrating from Vue to React, improving load times by 30%",
                "Developed custom UI components using Tailwind CSS and Framer Motion",
                "Worked on backend services to support frontend functionality" // The target for a mock suggestion
            ]
        },
        {
            id: "exp-2",
            title: "Web Developer",
            company: "StartUp LLC",
            date: "Jul 2018 - Dec 2020",
            bullets: [
                "Maintained existing codebase and added new features using JavaScript",
                "Collaborated with designers to implement pixel-perfect user interfaces",
                "Optimized images and assets for faster page rendering"
            ]
        }
    ],
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Tailwind CSS", "GraphQL"],
    education: [
        {
            id: "edu-1",
            degree: "B.S. Computer Science",
            school: "University of Technology",
            date: "2014 - 2018"
        }
    ]
};

const mockSuggestions: AI_Suggestion[] = [
    {
        id: "sug-1",
        type: "CRITICAL",
        section: "Experience",
        title: "Missing Quantifiable Metrics",
        description: "Add numbers to your achievements to show measurable impact.",
        applied: false,
        originalText: "Worked on backend services to support frontend functionality",
        suggestedText: "Engineered scalable REST APIs serving 10k+ daily users, reducing latency by 40%"
    },
    {
        id: "sug-2",
        type: "IMPROVEMENT",
        section: "Skills",
        title: "Optimize Keywords",
        description: "Include more exact keyword matches for Target Job Roles.",
        applied: false,
        originalText: "JavaScript",
        suggestedText: "JavaScript (ES6+)"
    }
];

export function EditorProvider({ children, initialResume }: { children: ReactNode; initialResume?: any }) {
    // Keep a strict ref to originalData that never changes
    const [originalData] = useState<ResumeData>(defaultResume);
    const [data, setData] = useState<ResumeData>(defaultResume);
    const [suggestions, setSuggestions] = useState<AI_Suggestion[]>(mockSuggestions);
    const [atsScore, setAtsScore] = useState(initialResume?.atsScore || 65);
    const [isSaving, setIsSaving] = useState(false);
    const [splitView, setSplitView] = useState(false);

    // History
    const [appliedFixes, setAppliedFixes] = useState<AppliedFix[]>([]);
    const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

    // Auto-save debounce logic
    useEffect(() => {
        setIsSaving(true);
        const handler = setTimeout(() => {
            setIsSaving(false);
            // Here you would PATCH /api/resume/content
        }, 1500);
        return () => clearTimeout(handler);
    }, [data]);

    const updateData = useCallback((section: keyof ResumeData, value: any) => {
        setData((prev) => ({ ...prev, [section]: value }));
    }, []);

    const applySuggestion = useCallback((id: string, newText: string) => {
        const suggestion = suggestions.find(s => s.id === id);
        if (!suggestion) return;

        setSuggestions((prev) => prev.map(s => s.id === id ? { ...s, applied: true } : s));

        const fixId = Math.random().toString(36).substring(7);
        const now = new Date();

        setAppliedFixes(prev => [{
            id: fixId,
            suggestionId: id,
            section: suggestion.section,
            originalText: suggestion.originalText || "",
            newText: newText,
            appliedAt: now,
            source: "ai"
        }, ...prev]);

        setChangeLog(prev => [{
            id: Math.random().toString(36).substring(7),
            timestamp: now,
            section: suggestion.section,
            description: `AI applied fixing: ${suggestion.title}`,
            fixId: fixId
        }, ...prev]);

        // Animate score upward!
        setAtsScore((prev: number) => Math.min(prev + Math.floor(Math.random() * 8) + 4, 98));

        // For this mock
        setData((prev: ResumeData) => {
            const next = { ...prev };
            next.experience = next.experience.map(job => ({
                ...job,
                bullets: job.bullets.map(b => b.includes(suggestion.originalText || "Worked on backend services") && newText.includes("REST APIs") ? newText : b)
            }));
            next.skills = next.skills.map(s => s === "JavaScript" && newText.includes("ES6+") ? newText : s);
            return next;
        });

        toast.success("Fix applied and score updated!");
    }, [suggestions]);

    const ignoreSuggestion = useCallback((id: string) => {
        setSuggestions((prev) => prev.filter(s => s.id !== id));
    }, []);

    const applyAllSuggestions = useCallback(() => {
        suggestions.filter(s => !s.applied).forEach(s => {
            applySuggestion(s.id, s.suggestedText || "");
        });
        toast.success("All fixes applied in sequence");
    }, [suggestions, applySuggestion]);

    const undoFix = useCallback((fixId: string) => {
        const fix = appliedFixes.find(f => f.id === fixId);
        if (!fix) return;

        // Undo data mock text replacement
        setData((prev: ResumeData) => {
            const next = { ...prev };
            next.experience = next.experience.map(job => ({
                ...job,
                bullets: job.bullets.map(b => b.includes(fix.newText) ? fix.originalText : b)
            }));
            next.skills = next.skills.map(s => s === fix.newText ? fix.originalText : s);
            return next;
        });

        // Set suggestion applied back to false
        setSuggestions((prev) => prev.map(s => s.id === fix.suggestionId ? { ...s, applied: false } : s));

        // Remove from history
        setAppliedFixes(prev => prev.filter(f => f.id !== fixId));
        setChangeLog(prev => prev.filter(l => l.fixId !== fixId));

        // Penalty mock
        setAtsScore((prev: number) => Math.max(prev - 5, 20));

        toast.success("Reverted change successfully");
    }, [appliedFixes]);

    const undoAll = useCallback(() => {
        setData(originalData);
        setAppliedFixes([]);
        setChangeLog([]);
        setSuggestions(prev => prev.map(s => ({ ...s, applied: false })));
        setAtsScore(65); // reset back to base mock
        toast.success("All edits reverted to original");
    }, [originalData]);

    return (
        <EditorContext.Provider value={{
            data, originalData, updateData, suggestions, applySuggestion, ignoreSuggestion, applyAllSuggestions, undoFix, undoAll, appliedFixes, changeLog, atsScore, isSaving, splitView, setSplitView
        }}>
            {children}
        </EditorContext.Provider>
    );
}

export function useEditor() {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditor must be used within EditorProvider");
    return context;
}
