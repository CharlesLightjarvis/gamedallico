import { Head, Link, router, usePage } from "@inertiajs/react";
import { useEchoPublic } from "@laravel/echo-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicGameRoom } from "@/types/game";

export default function Welcome({ rooms: initialRooms = [] }: { rooms?: PublicGameRoom[] }) {
    const [rooms, setRooms] = useState(initialRooms);
    const [nickname, setNickname] = useState("");
    const [capacity, setCapacity] = useState(4);
    const { auth } = usePage().props;
    const user = auth.user as { id: number; name: string } | null;

    useEchoPublic<{ rooms: PublicGameRoom[] }>("game-rooms", ".rooms.updated", (event) => {
        setRooms(event.rooms);
    });

    const createRoom = () => {
        if (!user) return;
        router.post("/game-rooms", { capacity });
    };
    const joinRoom = (room: PublicGameRoom) => {
        if (!user) return;
        router.post(`/game-rooms/${encodeURIComponent(room.code)}/join`);
    };

    return (
        <>
            <Head title="Buzz Wort · Jouer" />
            <main className="relative min-h-screen overflow-hidden bg-[#030525] text-white">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,.18),_transparent_55%)]" />
                <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 lg:px-10">
                    <header className="flex items-center justify-between">
                        <span className="text-sm font-black uppercase tracking-[.24em] text-sky-200">Gamedal</span>
                        {user ? <span className="text-sm text-white/60">Salut, {user.name}</span> : <Link href="/login" className="text-sm font-semibold text-white/70 hover:text-white">Connexion</Link>}
                    </header>

                    <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1fr_420px]">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[.25em] text-amber-300">Jeu de vocabulaire en direct</p>
                            <h1 className="mt-4 max-w-2xl text-5xl font-black leading-[.98] tracking-tight sm:text-6xl lg:text-7xl">Buzze. Traduis. Marque des points.</h1>
                            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sky-100/65">Affrontez vos amis autour de mots allemands. Traduction, grammaire et conjugaison : chaque étape peut faire basculer la partie.</p>
                            <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-white/55">
                                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">2 à 4 joueurs</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">5 mots par partie</span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Buzz en temps réel</span>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-[#080a25]/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                            {!user ? (
                                <form onSubmit={(event) => { event.preventDefault(); router.post("/play/guest", { nickname }); }}>
                                    <p className="text-xs font-black uppercase tracking-[.2em] text-sky-200">Jouer gratuitement</p>
                                    <h2 className="mt-2 text-2xl font-black">Choisis un pseudo</h2>
                                    <p className="mt-2 text-sm text-white/50">Pas besoin de créer un compte pour rejoindre une partie.</p>
                                    <Input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={20} required placeholder="Ton pseudo" className="mt-6 h-12 border-white/15 bg-white/[.06] text-white placeholder:text-white/35" />
                                    <Button type="submit" className="mt-3 h-12 w-full bg-amber-300 font-black text-[#11142d] hover:bg-amber-200">Continuer</Button>
                                </form>
                            ) : (
                                <>
                                    <p className="text-xs font-black uppercase tracking-[.2em] text-sky-200">Nouvelle partie</p>
                                    <h2 className="mt-2 text-2xl font-black">Crée ta salle</h2>
                                    <label className="mt-6 block text-sm font-semibold text-white/65" htmlFor="capacity">Nombre de joueurs</label>
                                    <div className="mt-2 grid grid-cols-3 gap-2" id="capacity">
                                        {[2, 3, 4].map((value) => <button key={value} type="button" onClick={() => setCapacity(value)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${capacity === value ? "border-amber-300 bg-amber-300 text-[#11142d]" : "border-white/10 bg-white/5 text-white/70"}`}>{value} joueurs</button>)}
                                    </div>
                                    <Button onClick={createRoom} className="mt-4 h-12 w-full bg-amber-300 font-black text-[#11142d] hover:bg-amber-200">Créer une partie</Button>
                                </>
                            )}
                            <div className="my-6 border-t border-white/10" />
                            <div className="flex items-center justify-between">
                                <h2 className="font-black">Salles ouvertes</h2>
                                <span className="text-xs text-white/40">{rooms.length} disponible{rooms.length === 1 ? "" : "s"}</span>
                            </div>
                            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                                {rooms.length ? rooms.map((room) => (
                                    <div key={room.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
                                        <div className="min-w-0"><p className="truncate text-sm font-bold">{room.host}</p><p className="mt-0.5 text-xs text-white/45">{room.players_count}/{room.capacity} joueurs · {room.code}</p></div>
                                        <Button size="sm" variant="outline" disabled={!user || room.players_count >= room.capacity} onClick={() => joinRoom(room)} className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10">Rejoindre</Button>
                                    </div>
                                )) : <p className="rounded-xl bg-white/[.03] px-4 py-5 text-center text-sm text-white/40">Aucune salle pour le moment. Lance la première partie !</p>}
                            </div>
                            {!user ? <p className="mt-3 text-center text-[11px] text-white/35">Entre ton pseudo pour créer ou rejoindre une salle.</p> : null}
                        </div>
                    </section>
                    <footer className="flex justify-between border-t border-white/10 pt-5 text-xs text-white/30"><span>Buzz Wort</span><span>Prêt à jouer ?</span></footer>
                </div>
            </main>
        </>
    );
}
