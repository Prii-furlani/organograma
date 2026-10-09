import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

export const PRESENTATION_STEPS = [
    { id: 1, title: 'Direção Executiva (Co-CEOs)', matchTitle: 'CEO' },
    { id: 2, title: 'Staffs Executivos', matchTitle: 'Staff' },
    { id: 3, title: 'Diretoria Comercial', matchTitle: 'Comercial' },
    { id: 4, title: 'Diretoria de Operações', matchTitle: 'Operações' },
    { id: 5, title: 'GIA', matchTitle: 'GIA' },
    { id: 6, title: 'Diretoria Administrativa', matchTitle: 'Administrativa' },
    { id: 7, title: 'Diretoria de Tecnologia e Inovação', matchTitle: 'Tecnologia' },
    { id: 8, title: 'Visão Panorâmica', isPanoramic: true }
];

export function usePresentationMode(expandAll) {
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const { setCenter, fitView, getNodes } = useReactFlow();
    const timerRef = useRef(null);

    const navegarParaEtapa = useCallback((indiceEtapa) => {
        const todosOsNos = getNodes();
        if (!todosOsNos || todosOsNos.length === 0) return;

        let noAlvo = null;

        switch (indiceEtapa) {
            case 0: // Co-CEOs (Raiz)
                noAlvo = todosOsNos.find(n => n.type === 'ceo' || !n.parent_id);
                break;
            case 1: // Staffs / Assessorias
                noAlvo = todosOsNos.find(n => n.data?.nivel?.toLowerCase() === 'staff' || n.data?.titulo?.toUpperCase().includes('SECRETARIA') || n.data?.titulo?.toUpperCase().includes('SGI') || n.data?.titulo?.toUpperCase().includes('ESG') || n.data?.titulo?.toUpperCase().includes('PLANEJAMENTO'));
                break;
            case 2: // Comercial / Vendas
                noAlvo = todosOsNos.find(n => n.data?.titulo?.toUpperCase().includes('COMERCIAL') || n.data?.titulo?.toUpperCase().includes('VENDAS'));
                break;
            case 3: // Operações
                noAlvo = todosOsNos.find(n => n.data?.titulo?.toUpperCase().includes('OPERAÇÕES'));
                break;
            case 4: // GIA
                noAlvo = todosOsNos.find(n => n.data?.titulo?.toUpperCase().includes('GIA') || n.data?.titulo?.toUpperCase().includes('INSPEÇÃO'));
                break;
            case 5: // Administrativa
                noAlvo = todosOsNos.find(n => n.data?.titulo?.toUpperCase().includes('ADMINISTRATIVA') || n.data?.titulo?.toUpperCase().includes('FINANCEIRO'));
                break;
            case 6: // Tecnologia e Inovação
                noAlvo = todosOsNos.find(n => n.data?.titulo?.toUpperCase().includes('TECNOLOGIA') || n.data?.titulo?.toUpperCase().includes('INOVAÇÃO'));
                break;
            case 7: // Visão Geral
                fitView({ padding: 0.15, duration: 900 });
                // Limpa spotlight
                document.querySelectorAll('.jhe-node-spotlight').forEach(el => el.classList.remove('jhe-node-spotlight'));
                return;
            default:
                noAlvo = todosOsNos[0];
        }

        if (noAlvo) {
            const largura = noAlvo.width || (noAlvo.type === 'ceo' ? 380 : 260);
            const altura = noAlvo.height || (noAlvo.type === 'ceo' ? 170 : 115);
            const centroX = noAlvo.position.x + largura / 2;
            const centroY = noAlvo.position.y + altura / 2;

            // Dispara o movimento suave de câmera e zoom focado
            setCenter(centroX, centroY, { zoom: 1.25, duration: 800 });

            // Spotlight
            document.querySelectorAll('.jhe-node-spotlight').forEach(el => el.classList.remove('jhe-node-spotlight'));
            const nodeElement = document.querySelector(`[data-id="${noAlvo.id}"] .jhe-node-card`) || document.querySelector(`[data-id="${noAlvo.id}"] .jhe-ceo-card`);
            if (nodeElement) {
                nodeElement.classList.add('jhe-node-spotlight');
            }
        }
    }, [getNodes, setCenter, fitView]);

    useEffect(() => {
        if (isPresentationMode) {
            // Garante que tudo esteja expandido antes de navegar
            expandAll();
            // Dá um pequeno tempo para a expansão renderizar antes de mover a câmera
            setTimeout(() => {
                navegarParaEtapa(currentStep);
            }, 50);
        }
    }, [currentStep, isPresentationMode, navegarParaEtapa, expandAll]);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => (prev + 1) % PRESENTATION_STEPS.length);
    }, []);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => (prev - 1 < 0 ? PRESENTATION_STEPS.length - 1 : prev - 1));
    }, []);

    const togglePlay = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    const startPresentation = useCallback(() => {
        setIsPresentationMode(true);
        setCurrentStep(0);
        setIsPlaying(true); // Inicia automaticamente
        
        try {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch (e) {}
    }, []);

    const stopPresentation = useCallback(() => {
        setIsPresentationMode(false);
        setIsPlaying(false);
        document.querySelectorAll('.jhe-node-spotlight').forEach(el => el.classList.remove('jhe-node-spotlight'));
        
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        } catch (e) {}
        
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.18, duration: 500 });
        });
    }, [fitView]);

    useEffect(() => {
        if (isPlaying && isPresentationMode) {
            timerRef.current = setInterval(() => {
                nextStep();
            }, 4000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, isPresentationMode, nextStep]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isPresentationMode) {
                stopPresentation();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresentationMode, stopPresentation]);

    return {
        isPresentationMode,
        currentStep,
        totalSteps: PRESENTATION_STEPS.length,
        currentStepData: PRESENTATION_STEPS[currentStep],
        isPlaying,
        startPresentation,
        stopPresentation,
        nextStep,
        prevStep,
        togglePlay
    };
}
