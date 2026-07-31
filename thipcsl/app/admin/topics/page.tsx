'use client';

import { useState, useEffect } from 'react';

export default function TopicManagement() {
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterParentId, setFilterParentId] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [order, setOrder] = useState(0);
    const [isActive, setIsActive] = useState(true);

    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);

    // Quick Add State
    const [quickAddRoot, setQuickAddRoot] = useState('');
    const [quickAddSub, setQuickAddSub] = useState<{ [key: string]: string }>({});
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        const res = await fetch('/api/admin/topics');
        if (res.ok) {
            const data = await res.json();
            setTopics(data);
        }
        setLoading(false);
    };

    const openModal = (topic?: any) => {
        if (topic) {
            setEditingId(topic.id);
            setName(topic.name);
            setParentId(topic.parentId || '');
            setOrder(topic.order || 0);
            setIsActive(topic.isActive !== undefined ? topic.isActive : true);
        } else {
            setEditingId(null);
            setName('');
            setParentId('');
            setOrder(0);
            setIsActive(true);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setName('');
        setParentId('');
        setOrder(0);
        setIsActive(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const url = editingId ? `/api/admin/topics/${editingId}` : '/api/admin/topics';
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId: parentId || null, order, isActive }),
        });

        if (res.ok) {
            fetchTopics();
            closeModal();
        } else {
            alert('Lỗi khi lưu chủ đề');
        }
    };

    const handleToggleStatus = async (topic: any) => {
        const res = await fetch(`/api/admin/topics/${topic.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: topic.name, parentId: topic.parentId, isActive: !topic.isActive }),
        });
        if (res.ok) {
            fetchTopics();
        } else {
            alert('Lỗi khi cập nhật trạng thái');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa chủ đề này?')) return;
        const res = await fetch(`/api/admin/topics/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchTopics();
        } else {
            const data = await res.json();
            alert(data.error || 'Lỗi khi xóa');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        // Collect all visible topic IDs (root + their children)
        const allVisibleIds: string[] = [];
        for (const root of filteredRootTopics) {
            allVisibleIds.push(root.id);
            for (const child of getChildren(root.id)) {
                allVisibleIds.push(child.id);
            }
        }
        if (allVisibleIds.length === 0) return;

        // If all visible are selected, deselect all; otherwise select all
        const allSelected = allVisibleIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allVisibleIds));
        }
    };

    const handleBulkExport = async () => {
        if (selectedIds.size === 0) {
            alert('Vui lòng chọn ít nhất một chủ đề để xuất');
            return;
        }
        setExporting(true);
        try {
            const res = await fetch('/api/admin/topics/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topicIds: [...selectedIds] }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Lỗi khi xuất câu hỏi');
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const disposition = res.headers.get('Content-Disposition');
            const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
            link.download = filenameMatch?.[1] ?? 'cau_hoi.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Lỗi kết nối khi xuất câu hỏi');
        } finally {
            setExporting(false);
        }
    };

    const handleQuickAdd = async (names: string, pId: string | null = null) => {
        if (!names.trim()) return;
        setIsAdding(true);
        const topicNames = names.split(/[,|\n]/).map(n => n.trim()).filter(n => n !== '');

        for (const tName of topicNames) {
            try {
                await fetch('/api/admin/topics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: tName, parentId: pId, isActive: true }),
                });
            } catch (error) {
                console.error('Error adding topic', tName, error);
            }
        }

        fetchTopics();
        setIsAdding(false);
        if (!pId) setQuickAddRoot('');
        else setQuickAddSub(prev => ({ ...prev, [pId]: '' }));
    };

    const handleMove = async (topic: any, direction: 'up' | 'down', siblings: any[]) => {
        const currentIndex = siblings.findIndex(t => t.id === topic.id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= siblings.length) return;

        const targetTopic = siblings[targetIndex];

        // Swap orders
        const itemsToUpdate = [
            { id: topic.id, order: targetTopic.order },
            { id: targetTopic.id, order: topic.order }
        ];

        // Optimistic update
        const newTopics = [...topics];
        // This is complex to update locally because of hierarchy, so we'll just reload for now or try to be smart
        // Let's just call API

        const res = await fetch('/api/admin/topics/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsToUpdate }),
        });

        if (res.ok) {
            fetchTopics();
        } else {
            alert('Lỗi khi sắp xếp');
        }
    };

    const handleOrderUpdate = async (topic: any, newOrder: string) => {
        const order = parseInt(newOrder);
        if (isNaN(order)) return;

        const res = await fetch(`/api/admin/topics/${topic.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: topic.name, parentId: topic.parentId, order }),
        });

        if (res.ok) {
            fetchTopics();
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/topics/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setImportMessage({
                    type: 'success',
                    text: data.message || `Đã import thành công ${data.count} chủ đề!`
                });
                fetchTopics();
                if (data.errors && data.errors.length > 0) {
                    console.warn('Import errors:', data.errors);
                    alert('Có một số lỗi khi import:\n' + data.errors.join('\n'));
                }
            } else {
                setImportMessage({
                    type: 'error',
                    text: data.error || 'Lỗi khi import file'
                });
            }
        } catch (error) {
            setImportMessage({
                type: 'error',
                text: 'Lỗi kết nối server'
            });
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { 'Name': 'An toàn lao động', 'Parent Topic': '', 'Is Active': 'TRUE' },
            { 'Name': 'PCCC', 'Parent Topic': 'An toàn lao động', 'Is Active': 'TRUE' },
            { 'Name': 'Kỹ thuật', 'Parent Topic': '', 'Is Active': 'TRUE' },
            { 'Name': 'Điện', 'Parent Topic': 'Kỹ thuật', 'Is Active': 'TRUE' },
        ];

        const headers = ['Name', 'Parent Topic', 'Is Active'];
        const csvContent = [
            headers.join(','),
            ...templateData.map(row =>
                headers.map(h => `"${row[h as keyof typeof row]}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_topics.csv';
        link.click();
    };

    // Filter and Organize
    const rootTopics = topics.filter(t => !t.parentId);

    const filteredRootTopics = rootTopics.filter(t => {
        const matchesName = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const children = topics.filter(c => c.parentId === t.id);
        const hasMatchingChildren = children.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesParent = filterParentId ? t.id === filterParentId : true;

        return (matchesName || hasMatchingChildren) && matchesParent;
    });

    const getChildren = (id: string) => {
        let children = topics.filter(t => t.parentId === id);
        // Sort children by order (already sorted from API, but good to be safe)
        children.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (searchTerm) {
            children = children.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return children;
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-black">Quản lý Chủ đề</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold whitespace-nowrap"
                    >
                        + Thêm Chủ đề
                    </button>
                    <button
                        onClick={handleDownloadTemplate}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
                    >
                        📥 Tải Template
                    </button>
                    <label className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 cursor-pointer whitespace-nowrap">
                        {importing ? 'Đang import...' : '📤 Import Excel'}
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleImport}
                            disabled={importing}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={handleBulkExport}
                        disabled={exporting || selectedIds.size === 0}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Xuất Excel các chủ đề đã chọn"
                    >
                        {exporting ? 'Đang xuất...' : `📤 Xuất Excel (${selectedIds.size})`}
                    </button>
                </div>
            </div>

            {/* Select All Bar */}
            <div className="mb-4 flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={
                            (() => {
                                const allVisibleIds: string[] = [];
                                for (const root of filteredRootTopics) {
                                    allVisibleIds.push(root.id);
                                    for (const child of getChildren(root.id)) {
                                        allVisibleIds.push(child.id);
                                    }
                                }
                                return allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
                            })()
                        }
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">Chọn tất cả</span>
                </label>
                <span className="text-xs text-gray-500">
                    Đã chọn {selectedIds.size} chủ đề
                </span>
                {selectedIds.size > 0 && (
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs text-red-600 hover:underline"
                    >
                        Bỏ chọn tất cả
                    </button>
                )}
            </div>

            {/* Search Bar */}
            {/* Search Bar & Filters */}
            <div className="mb-6 flex gap-4">
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm chủ đề..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-black"
                />
                <select
                    value={filterParentId}
                    onChange={(e) => setFilterParentId(e.target.value)}
                    className="p-3 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-black min-w-[200px]"
                >
                    <option value="">-- Tất cả chủ đề gốc --</option>
                    {rootTopics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* Quick Add Root */}
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200 flex gap-2 items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Thêm nhanh chủ đề gốc (nhập nhiều tên cách nhau bằng dấu phẩy)..."
                        value={quickAddRoot}
                        onChange={(e) => setQuickAddRoot(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(quickAddRoot)}
                        className="w-full p-2 border border-blue-300 rounded text-black outline-none focus:ring-2 focus:ring-blue-400"
                        disabled={isAdding}
                    />
                </div>
                <button
                    onClick={() => handleQuickAdd(quickAddRoot)}
                    disabled={isAdding || !quickAddRoot.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold disabled:bg-blue-300"
                >
                    {isAdding ? 'Đang thêm...' : 'Thêm nhanh'}
                </button>
            </div>

            {importMessage && (
                <div className={`mb-4 p-3 rounded ${importMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {importMessage.text}
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {filteredRootTopics.map((root, index) => (
                    <div key={root.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="text-black font-bold text-lg flex items-center">
                                {root.name} <span className="text-gray-500 text-sm ml-2">({root._count?.questions || 0} câu hỏi)</span>
                                {!root.isActive && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Đã tắt</span>}
                            </span>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(root.id)}
                                    onChange={() => toggleSelect(root.id)}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => handleToggleStatus(root)}
                                    className={`text-sm px-2 py-1 rounded border ${root.isActive ? 'text-yellow-700 border-yellow-300 bg-yellow-50' : 'text-green-700 border-green-300 bg-green-50'}`}
                                >
                                    {root.isActive ? 'Tắt' : 'Bật'}
                                </button>
                                <button onClick={() => openModal(root)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Sửa</button>
                                <button onClick={() => handleDelete(root.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded">Xóa</button>
                            </div >
                        </div >

                        {/* Quick Add Sub-topic */}
                        <div className="ml-8 mt-3 flex gap-2">
                            <input
                                type="text"
                                placeholder={`Thêm nhanh chủ đề con cho "${root.name}" (cách nhau bằng dấu phẩy)...`}
                                value={quickAddSub[root.id] || ''}
                                onChange={(e) => setQuickAddSub(prev => ({ ...prev, [root.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(quickAddSub[root.id], root.id)}
                                className="flex-1 p-1.5 text-sm border border-gray-200 rounded text-black outline-none focus:border-blue-400"
                                disabled={isAdding}
                            />
                            <button
                                onClick={() => handleQuickAdd(quickAddSub[root.id], root.id)}
                                disabled={isAdding || !(quickAddSub[root.id] || '').trim()}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Thêm con
                            </button>
                        </div>

                        {/* Children */}
                        {
                            getChildren(root.id).length > 0 && (
                                <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-300 pl-4">
                                    {getChildren(root.id).map((child, childIndex, childArray) => (
                                        <div key={child.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 hover:border-blue-200 transition-colors">
                                            <span className="text-black font-medium flex items-center">
                                                {child.name} <span className="text-gray-500 text-xs">({child._count?.questions || 0} câu hỏi)</span>
                                                {!child.isActive && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Đã tắt</span>}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(child.id)}
                                                    onChange={() => toggleSelect(child.id)}
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleToggleStatus(child)}
                                                    className={`text-xs px-2 py-1 rounded border ${child.isActive ? 'text-yellow-700 border-yellow-300 bg-yellow-50' : 'text-green-700 border-green-300 bg-green-50'}`}
                                                >
                                                    {child.isActive ? 'Tắt' : 'Bật'}
                                                </button>
                                                <button onClick={() => openModal(child)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm">Sửa</button>
                                                <button onClick={() => handleDelete(child.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm">Xóa</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div >
                ))
                }
                {filteredRootTopics.length === 0 && <p className="text-gray-500 text-center py-8">Không tìm thấy chủ đề nào.</p>}
            </div >


            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h2 className="text-xl font-bold mb-4 text-black">{editingId ? 'Sửa chủ đề' : 'Thêm chủ đề mới'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tên chủ đề</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black focus:ring-blue-500 focus:border-blue-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Chủ đề cha (nếu có)</label>
                                    <select
                                        value={parentId}
                                        onChange={(e) => setParentId(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                                    >
                                        <option value="">-- Không (Cấp 1) --</option>
                                        {rootTopics.filter(t => t.id !== editingId).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Thứ tự hiển thị</label>
                                    <input
                                        type="number"
                                        value={order}
                                        onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isActiveModal"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isActiveModal" className="ml-2 block text-sm text-gray-900">
                                        Kích hoạt (Hiển thị cho người dùng)
                                    </label>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t mt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 font-medium"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold"
                                    >
                                        {editingId ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
