// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrthographicCamera } from '@react-three/drei';
import { useDualSenseWS } from './useDualSenseWS';
import { useGLTF } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import gsap from 'gsap';

// Simple 3D Controller purely for the Showcase
const ShowcaseController = ({ action }) => {
    const { nodes } = useGLTF('/playstation/ps5_controller.glb');
    const actionGroup = useRef();
    const floatGroup = useRef();

    useEffect(() => {
        if (!actionGroup.current) return;

        gsap.killTweensOf(actionGroup.current.rotation);
        gsap.killTweensOf(actionGroup.current.position);
        gsap.killTweensOf(actionGroup.current.scale);

        // If a button was released, animate smoothly back to origin
        if (action === 'RELEASE' || !action) {
            gsap.to(actionGroup.current.rotation, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.out" });
            gsap.to(actionGroup.current.position, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.out" });
            return;
        }

        if (action === 'DPAD_LEFT' || action === 'SQUARE') {
            gsap.to(actionGroup.current.rotation, { z: 0.2, y: -0.1, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { x: -0.15, duration: 0.2, ease: "power1.out" });
        } else if (action === 'DPAD_RIGHT' || action === 'CIRCLE') {
            gsap.to(actionGroup.current.rotation, { z: -0.2, y: 0.1, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { x: 0.15, duration: 0.2, ease: "power1.out" });
        } else if (action === 'DPAD_UP' || action === 'TRIANGLE') { // Forward / Up
            gsap.to(actionGroup.current.rotation, { x: 0.2, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { z: 0.2, duration: 0.2, ease: "power1.out" });
        } else if (action === 'DPAD_DOWN' || action === 'CROSS') { // Down
            gsap.to(actionGroup.current.rotation, { x: -0.2, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { z: -0.2, duration: 0.2, ease: "power1.out" });
        } else if (action === 'L_TRIGGER') { // Tilt Up and Left
            gsap.to(actionGroup.current.rotation, { x: 0.2, z: 0.15, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { y: 0.15, x: -0.1, duration: 0.2, ease: "power1.out" });
        } else if (action === 'R_TRIGGER') { // Tilt Up and Right
            gsap.to(actionGroup.current.rotation, { x: 0.2, z: -0.15, duration: 0.2, ease: "power1.out" });
            gsap.to(actionGroup.current.position, { y: 0.15, x: 0.1, duration: 0.2, ease: "power1.out" });
        }
    }, [action]);

    useFrame((state) => {
        if (floatGroup.current) {
            floatGroup.current.position.y = Math.sin(state.clock.elapsedTime) * 0.15;
            floatGroup.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
        }
    });

    return (
        <group ref={floatGroup} scale={[3, 3, 3]}>
            <group ref={actionGroup} dispose={null}>
                {nodes.Scene && <primitive object={nodes.Scene} />}
                {!nodes.Scene && Object.keys(nodes).map(key => {
                    const node = nodes[key];
                    if (node.isMesh) return <mesh key={key} geometry={node.geometry} material={node.material} />
                    return null;
                })}
            </group>
        </group>
    );
};

export default function ControllerDashboard() {
    const { action, session } = useDualSenseWS();
    const navigate = useNavigate();
    const bgRef = useRef(null);
    const textRef = useRef(null);
    const [hasConnected, setHasConnected] = useState(false);

    useEffect(() => {
        if (action) {
            setHasConnected(true);
        }
    }, [action]);

    // R1/R2 → exit showcase back to home (after the tilt animation plays)
    useEffect(() => {
        if (action === 'R_TRIGGER') {
            const t = setTimeout(() => navigate('/home'), 400);
            return () => clearTimeout(t);
        }
    }, [action, navigate]);

    // Blast background visual effect (and trigger controller vibration)
    useEffect(() => {
        if (!action) return;

        // vibrate any attached gamepad when a button/menu is pressed
        if (action !== 'RELEASE' && navigator.getGamepads) {
            const gp = navigator.getGamepads()[0];
            try {
                if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
                    // simple rumble; adjust magnitudes/duration as desired
                    gp.vibrationActuator.playEffect('dual-rumble', {
                        duration: 200,
                        strongMagnitude: 0.5,
                        weakMagnitude: 0.5
                    });
                }
            } catch (e) {
                console.warn('gamepad vibration failed', e);
            }
        }

        // Reset color
        gsap.killTweensOf(bgRef.current);
        gsap.killTweensOf(textRef.current);

        let directionParams = { background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)' };
        let glowColor = 'rgba(0,0,0,0)';

        // 1. Determine Color (Based on the physical side of the controller)
        const controllerButtons = ['DPAD_LEFT', 'DPAD_RIGHT', 'DPAD_UP', 'DPAD_DOWN', 'L_TRIGGER', 'SQUARE', 'CIRCLE', 'TRIANGLE', 'CROSS', 'R_TRIGGER'];

        if (controllerButtons.includes(action)) glowColor = 'rgba(213, 184, 92, 0.48)';

        // 2. Determine Position (Based strictly on 3D tilt direction)
        let position = '50% 50%';
        if (['DPAD_LEFT', 'SQUARE'].includes(action)) position = '0% 50%'; // Tilt Left
        else if (['DPAD_RIGHT', 'CIRCLE'].includes(action)) position = '100% 50%'; // Tilt Right
        else if (['DPAD_UP', 'TRIANGLE'].includes(action)) position = '50% 0%'; // Tilt Forward/Up
        else if (['DPAD_DOWN', 'CROSS'].includes(action)) position = '50% 100%'; // Tilt Back/Down
        else if (action === 'L_TRIGGER') position = '0% 0%'; // Tilt Up & Left
        else if (action === 'R_TRIGGER') position = '100% 0%'; // Tilt Up & Right

        if (glowColor !== 'rgba(0,0,0,0)') {
            directionParams = { background: `radial-gradient(circle at ${position}, ${glowColor} 0%, transparent 60%)` };
        }

        gsap.fromTo(bgRef.current,
            { opacity: 1, ...directionParams },
            { opacity: 0, duration: 0.6, ease: "power2.out" }
        );

        // Pop text
        gsap.fromTo(textRef.current,
            { scale: 1.2, opacity: 1, textShadow: `0px 0px 30px ${glowColor.replace('0.5', '1')}` },
            { scale: 1, opacity: 0.3, textShadow: '0px 0px 0px rgba(0,0,0,0)', duration: 0.7 }
        );

    }, [action]);

    return (
        <div className="nj-controller-showcase relative w-full min-h-[100dvh] bg-[#090a0c] overflow-hidden flex flex-col items-center justify-center">

            {/* Background flash layer */}
            <div ref={bgRef} className="absolute inset-0 pointer-events-none opacity-0 mix-blend-screen mix-blend-lighten"></div>

            {/* Giant 3D Canvas in center */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <Canvas>
                    <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={120} />
                    <ambientLight intensity={0.7} />
                    <spotLight position={[10, 10, 10]} angle={0.25} penumbra={1} intensity={1.5} />
                    <spotLight position={[-10, -10, -10]} angle={0.25} penumbra={1} intensity={0.5} />
                    <Environment preset="studio" />
                    <ShowcaseController action={action} />
                </Canvas>
            </div>

            {/* Text UI */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-between py-[calc(100px+env(safe-area-inset-top))] px-4 sm:px-8">
                <h1 className="text-[clamp(1rem,3vw,2.1rem)] font-semibold text-white tracking-[0.22em] uppercase opacity-45 text-center select-none pointer-events-none">
                    NJENGINES · CONTROLE
                </h1>

                <h2 ref={textRef} className="max-w-full text-[clamp(1.25rem,6vw,4.75rem)] font-semibold text-white tracking-[0.14em] text-center break-words opacity-45 select-none pointer-events-none transition-colors duration-100">
                    {action ? action.replace('_', ' ') : "AGUARDANDO SINAL"}
                </h2>

                <p className="max-w-full text-center text-white font-medium text-xs sm:text-sm uppercase tracking-[0.16em] opacity-60 select-none pointer-events-none">
                    Pressione um botão &nbsp;·&nbsp; R1/R2 para voltar
                </p>
            </div>

            {/* UI guidelines just to look cool */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5"></div>
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/5"></div>
            </div>

            {/* Connection Popup */}
            {!hasConnected && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-1000">
                    <div className="nj-controller-connect-card bg-[#121315] border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center max-w-lg w-[min(92vw,32rem)] max-h-[90dvh] overflow-y-auto text-center">
                        <h2 className="text-[clamp(1.35rem,5vw,1.9rem)] font-semibold text-white tracking-[0.12em] uppercase mb-4">Conectar celular</h2>
                        <p className="text-white/65 mb-6 font-medium leading-relaxed text-sm sm:text-base">
                            Escaneie no celular para abrir o controle desta experiência. Redes com NAT ou firewall restritivos podem impedir a conexão; não há relay TURN configurado.
                        </p>
                        <div className="bg-white p-6 rounded-2xl mb-8 shadow-2xl">
                            <QRCodeSVG
                                value={`${window.location.protocol}//${window.location.host}/controller?session=${session}`}
                                size={220}
                            />
                        </div>
                        <p className="text-white/40 text-sm font-bold tracking-widest uppercase">
                            Sessão: <span className="text-white/80 text-lg ml-2">{session}</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
