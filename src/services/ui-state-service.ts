import { Events } from 'obsidian';

export type UIState = {
    isModalOpen: boolean;
};

export class UIStateService extends Events {
    private state: UIState = {
        isModalOpen: false,
    };

    getState(): UIState {
        return this.state;
    }

    setModalState(isOpen: boolean): void {
        if (this.state.isModalOpen !== isOpen) {
            this.state.isModalOpen = isOpen;
            this.trigger('modal-state-change', this.state);
        }
    }
}