'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { compactOptions, getNextOptionLabel, normalizeOptions, QuestionOptions } from '@/lib/question-options';

type Topic = {
    id: string;
    name: string;
    parentId: string | null;
};

export default function CreateQuestion() {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState<string[]>(['A']);
    const [options, setOptions] = useState<QuestionOptions>({
        A: '',
        B: '',
        C: '',
        D: '',
    });
    const [topics, setTopics] = useState<Topic[]>([]);

    useEffect(() => {
        let cancelled = false;

        fetch('/api/admin/topics')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (!cancelled) setTopics(data);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const optionKeys = Object.keys(normalizeOptions(options));

    const addOption = () => {
        const nextLabel = getNextOptionLabel(options);
        setOptions({ ...options, [nextLabel]: '' });
    };

    const removeOption = (opt: string) => {
        if (optionKeys.length <= 2) {
            alert('Can toi thieu 2 dap an');
            return;
        }

        const nextOptions = { ...options };
        delete nextOptions[opt];
        setOptions(nextOptions);
        setCorrectAnswer(correctAnswer.filter(answer => answer !== opt));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedOptions = compactOptions(options);
        const cleanedCorrectAnswer = correctAnswer.filter(answer => cleanedOptions[answer] !== undefined);

        const selectedTopic = topics.find(t => t.id === topicId);
        const categoryName = selectedTopic ? selectedTopic.name : '';

        const res = await fetch('/api/admin/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                category: categoryName,
                topicId,
                correct_answer: JSON.stringify(cleanedCorrectAnswer),
                options: cleanedOptions,
            }),
        });

        if (res.ok) {
            router.push('/admin/questions');
        } else {
            const data = await res.json();
            alert(data.error || 'Loi khi tao cau hoi');
        }
    };

    const rootTopics = topics.filter(t => !t.parentId);
    const getChildren = (id: string) => topics.filter(t => t.parentId === id);

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Them cau hoi moi</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Noi dung cau hoi</label>
                    <textarea
                        required
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-black h-32"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chu de</label>
                    <select
                        required
                        value={topicId}
                        onChange={(e) => setTopicId(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                    >
                        <option value="">-- Chon chu de --</option>
                        {rootTopics.map(root => {
                            const rootHasChildren = getChildren(root.id).length > 0;
                            return (
                                <optgroup key={root.id} label={root.name}>
                                    <option value={root.id} disabled={rootHasChildren}>
                                        {root.name} (Cap 1) {rootHasChildren ? '(Co chu de con - Vui long chon cap 2)' : ''}
                                    </option>
                                    {getChildren(root.id).map(child => (
                                        <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;{child.name}</option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">Danh sach dap an</label>
                        <button
                            type="button"
                            onClick={addOption}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                            + Them dap an
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {optionKeys.map((opt) => (
                            <div key={opt}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Dap an {opt}</label>
                                    <button
                                        type="button"
                                        onClick={() => removeOption(opt)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Xoa
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={options[opt] || ''}
                                    onChange={(e) => setOptions({ ...options, [opt]: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dap an dung (co the chon nhieu)</label>
                    <div className="flex flex-wrap gap-4">
                        {optionKeys.map((opt) => (
                            <label key={opt} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={correctAnswer.includes(opt)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setCorrectAnswer([...correctAnswer, opt]);
                                        } else {
                                            setCorrectAnswer(correctAnswer.filter(a => a !== opt));
                                        }
                                    }}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <span className="text-black">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                        Huy
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Luu cau hoi
                    </button>
                </div>
            </form>
        </div>
    );
}
