import { ArrowLeft, Eye, ImagePlus, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { createPost, deletePost, getPost, listOffers, setPublished, slugify, updatePost, uploadImage, type OfferOption, type Post, type PostDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { renderMarkdown } from '@/lib/markdown';
import { BLOG_URL } from '@/lib/supabase';
import { SendDialog } from '@/pages/SendDialog';
import { Badge, Button, ErrorBox, Field, Loading, PageHead, useToast } from '@/ui';

const EMPTY: PostDraft = { slug: '', kind: 'article', title: '', excerpt: '', coverUrl: '', body: '', offerId: null };

export default function EditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { session } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [draft, setDraft] = useState<PostDraft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [preview, setPreview] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listOffers().then(setOffers, () => setOffers([]));
    if (!id) return;
    getPost(id).then(
      (p) => {
        setPost(p);
        setDraft({ slug: p.slug, kind: p.kind, title: p.title, excerpt: p.excerpt, coverUrl: p.coverUrl, body: p.body, offerId: p.offerId });
        setSlugTouched(true);
        setLoading(false);
      },
      (e) => {
        setError(e);
        setLoading(false);
      },
    );
  }, [id]);

  const html = useMemo(() => (preview ? renderMarkdown(draft.body) : ''), [preview, draft.body]);
  const set = <K extends keyof PostDraft>(k: K, v: PostDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = !post || JSON.stringify(draft) !== JSON.stringify({ slug: post.slug, kind: post.kind, title: post.title, excerpt: post.excerpt, coverUrl: post.coverUrl, body: post.body, offerId: post.offerId });

  function onTitle(v: string) {
    setDraft((d) => ({ ...d, title: v, slug: slugTouched ? d.slug : slugify(v) }));
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function check() {
    if (!draft.title.trim()) throw new Error('Bài viết cần có tiêu đề');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) throw new Error('Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang');
  }

  const save = () =>
    run(async () => {
      check();
      const saved = post ? await updatePost(post.id, draft) : await createPost(draft, session!.id);
      setPost(saved);
      toast('Đã lưu');
      if (!post) nav(`/bai-viet/${saved.id}`, { replace: true });
    });

  const togglePublish = () =>
    run(async () => {
      if (!post) return;
      check();
      if (dirty) setPost(await updatePost(post.id, draft));
      const publish = post.status !== 'published';
      if (publish && !draft.body.trim()) throw new Error('Bài viết chưa có nội dung');
      const p = await setPublished(post.id, publish, post.publishedAt);
      setPost(p);
      toast(publish ? 'Đã đăng bài — bài hiện trên blog và trong app' : 'Đã gỡ bài về bản nháp');
    });

  const remove = () =>
    run(async () => {
      if (!post || !window.confirm('Xoá hẳn bài viết này? Không khôi phục được.')) return;
      await deletePost(post.id);
      toast('Đã xoá bài');
      nav('/', { replace: true });
    });

  const upload = (file: File | undefined, target: 'cover' | 'body') =>
    run(async () => {
      if (!file) return;
      const url = await uploadImage(file);
      if (target === 'cover') return set('coverUrl', url);
      const ta = bodyRef.current;
      const at = ta?.selectionStart ?? draft.body.length;
      const snippet = `\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n`;
      set('body', draft.body.slice(0, at) + snippet + draft.body.slice(at));
    });

  if (loading) return <Loading />;
  const published = post?.status === 'published';

  return (
    <>
      <PageHead
        title={post ? 'Sửa bài viết' : 'Viết bài mới'}
        desc={
          post ? (
            <>
              {published ? <Badge tone="success">Đã đăng</Badge> : <Badge>Bản nháp</Badge>}{' '}
              {published && (
                <a href={`${BLOG_URL}/bai-viet/${post.slug}`} target="_blank" rel="noopener">
                  Xem trên blog
                </a>
              )}
            </>
          ) : (
            'Lưu nháp trước, sau đó bấm Đăng bài.'
          )
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => nav('/')}>
              <ArrowLeft size={16} /> Danh sách
            </Button>
            <Button variant="outline" onClick={save} disabled={busy || !dirty}>
              Lưu
            </Button>
            {post && (
              <Button variant={published ? 'outline' : 'brand'} onClick={togglePublish} disabled={busy}>
                {published ? 'Gỡ bài' : 'Đăng bài'}
              </Button>
            )}
            {published && (
              <Button onClick={() => setSendOpen(true)} disabled={busy || dirty}>
                <Send size={16} /> Gửi thông báo
              </Button>
            )}
          </>
        }
      />
      <ErrorBox error={error} />
      <div className="editor">
        <div className="card stack">
          <Field label="Tiêu đề">
            <input className="input" maxLength={200} value={draft.title} onChange={(e) => onTitle(e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Loại bài">
              <select className="select" value={draft.kind} onChange={(e) => set('kind', e.target.value as PostDraft['kind'])}>
                <option value="article">Bài viết (chăm sóc bé, tin tức…)</option>
                <option value="promo">Chương trình khuyến mãi</option>
              </select>
            </Field>
            <Field label="Đường dẫn" hint={`${BLOG_URL.replace(/^https?:\/\//, '')}/bai-viet/${draft.slug || '…'}`}>
              <input
                className="input"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', slugify(e.target.value));
                }}
              />
            </Field>
          </div>
          {draft.kind === 'promo' && (
            <Field label="Gắn ưu đãi (không bắt buộc)" hint="Ưu đãi tạo ở trang quản trị. Bài sẽ có nút xem ưu đãi trong app.">
              <select className="select" value={draft.offerId ?? ''} onChange={(e) => set('offerId', e.target.value || null)}>
                <option value="">— Không gắn —</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Tóm tắt" hint="1–2 câu, hiện ở danh sách bài và khi chia sẻ lên Zalo/Facebook.">
            <textarea className="textarea" rows={2} maxLength={300} value={draft.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
          </Field>
          <div className="field">
            <span>Ảnh bìa</span>
            <div className="row wrap">
              {draft.coverUrl && <img src={draft.coverUrl} alt="" className="cover-thumb" />}
              <Button variant="outline" size="sm" onClick={() => coverInput.current?.click()} disabled={busy}>
                <ImagePlus size={14} /> {draft.coverUrl ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
              </Button>
              {draft.coverUrl && (
                <Button variant="ghost" size="sm" onClick={() => set('coverUrl', '')}>
                  Bỏ ảnh bìa
                </Button>
              )}
            </div>
            <small>Ảnh ngang tỉ lệ 16:9, tối đa 5 MB.</small>
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], 'cover')} />
          </div>
          <div className="field">
            <div className="row">
              <span className="grow">Nội dung</span>
              <Button variant="ghost" size="sm" onClick={() => imageInput.current?.click()} disabled={busy}>
                <ImagePlus size={14} /> Chèn ảnh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
                <Eye size={14} /> {preview ? 'Soạn thảo' : 'Xem trước'}
              </Button>
            </div>
            <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], 'body')} />
            {preview ? (
              <div className="article-preview">
                {draft.coverUrl && <img src={draft.coverUrl} alt="" />}
                <h1>{draft.title || 'Tiêu đề bài viết'}</h1>
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            ) : (
              <textarea ref={bodyRef} className="textarea body-input" rows={20} value={draft.body} onChange={(e) => set('body', e.target.value)} />
            )}
            <small>
              Định dạng: <code>## Tiêu đề mục</code>, <code>**chữ đậm**</code>, <code>- gạch đầu dòng</code>, <code>[chữ](https://link)</code>. Xuống dòng là ngắt dòng.
            </small>
          </div>
          {post && (
            <div className="row">
              <div className="grow" />
              <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
                <Trash2 size={14} /> Xoá bài
              </Button>
            </div>
          )}
        </div>
      </div>
      <SendDialog open={sendOpen} onClose={() => setSendOpen(false)} post={post} />
    </>
  );
}
