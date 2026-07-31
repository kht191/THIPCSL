'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use } from 'react';
import { compactOptions, getNextOptionLabel, normalizeOptions, parseCorrectAnswerValue, QuestionOptions } from '@/lib/question-options';

type Topic = {
    id: string;
    name: string;
    parentId: string | null;
};

export default function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { id } = use(params);

    // Read return filter state from query params
    const returnTopicId = searchParams.get('topicId') || '';
    const returnSearch = searchParams.get('search') || '';
    const returnPage = searchParams.get('page') || '1';
    const returnLimit = searchParams.get('limit') || '10';

    const buildReturnUrl = () => {
        const p = new URLSearchParams();
        if (returnTopicId) p.set('topicId', returnTopicId);
        if (returnSearch) p.set('search', returnSearch);
        p.set('page', returnPage);
        p.set('limit', returnLimit);
        const qs = p.toString();
        return `/admin/questions${qs ? `?${qs}` : ''}`;
    };

    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState<string[]>([]);
    const [options, setOptions] = useState<QuestionOptions>({
        A: '',
        B: '',
        C: '',
        D: '',
    });
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState<Topic[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const topicsRes = await fetch('/api/admin/topics');
                if (topicsRes.ok) {
                    setTopics(await topicsRes.json());
                }

                const res = await fetch(`/api/admin/questions/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setContent(data.content);
                    setTopicId(data.topicId || '');
                    setCorrectAnswer(parseCorrectAnswerValue(data.correct_answer));

                    let parsedOptions = data.options;
                    if (typeof data.options === 'string') {
                        try {
                            parsedOptions = JSON.parse(data.options);
                        } catch (e) {
                            console.error('Error parsing options', e);
                        }
                    }
                    setOptions(normalizeOptions(parsedOptions));
                } else {
                    alert('Khong tim thay cau hoi');
                    router.push(buildReturnUrl());
                }
            } catch (error) {
                console.error('Error fetching data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, router]);

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

        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'PUT',
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
            router.push(buildReturnUrl());
        } else {
            const data = await res.json();
            alert(data.error || 'Loi khi cap nhat cau hoi');
        }
    };

    const rootTopics = topics.filter(t => !t.parentId);
    const getChildren = (id: string) => topics.filter(t => t.parentId === id);

    if (loading) return <div className="p-8">Dang tai...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Chinh sua cau hoi</h1>

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
                        onClick={() => router.push(buildReturnUrl())}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                        Huy
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Cap nhat
                    </button>
                </div>
            </form>
        </div>
    );
}
