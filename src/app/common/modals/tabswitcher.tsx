// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRef } from "preact";
import React, { PureComponent } from "preact/compat";
import * as mobxReact from "mobx-preact";
import * as mobx from "mobx";
import { boundMethod } from "autobind-decorator";
import { If, For } from "tsx-control-statements/components";
import cn from "classnames";
import { GlobalModel, GlobalCommandRunner } from "@/models";
import { Modal, TextField, InputDecoration, Tooltip } from "@/elements";
import * as util from "@/util/util";
import { Screen } from "@/models";
import { TabIcon } from "@/elements/tabicon";

import "./tabswitcher.less";

type ViewDataType = {
    label: string;
    value: string;
};

type SwitcherDataType = {
    sessionId: string;
    sessionName: string;
    sessionIdx: number;
    screenId: string;
    screenIdx: number;
    screenName: string;
    icon: string;
    color: string;
    viewData?: ViewDataType;
};

const MaxOptionsToDisplay = 100;
const additionalOptions = [
    { label: "Connections", value: "connections" },
    { label: "History", value: "history" },
    { label: "Settings", value: "clientsettings" },
].map((item, index) => ({
    sessionId: `additional-${index}`,
    sessionName: "",
    sessionIdx: -1,
    screenId: `additional-${index}`,
    screenIdx: -1,
    screenName: "",
    icon: "",
    color: "",
    viewData: item,
}));

@mobxReact.observer
class TabSwitcherModal extends PureComponent<{}, {}> {
    screens: Map<string, OV<string>>[];
    sessions: Map<string, OV<string>>[];
    options: SwitcherDataType[] = [];
    sOptions: OArr<SwitcherDataType> = mobx.observable.array(null, {
        name: "TabSwitcherModal-sOptions",
    });
    focusedIdx: OV<number> = mobx.observable.box(0, { name: "TabSwitcherModal-selectedIdx" });
    activeSessionIdx: number;
    optionRefs = [];
    listWrapperRef = createRef<HTMLDivElement>();
    prevFocusedIdx = 0;

    componentDidMount() {
        this.activeSessionIdx = GlobalModel.getActiveSession().sessionIdx.get();
        const oSessions = GlobalModel.sessionList;
        const oScreens = GlobalModel.screenMap;
        oScreens.forEach((oScreen) => {
            if (oScreen == null) {
                return;
            }
            if (oScreen.archived.get()) {
                return;
            }
            // Find the matching session in the observable array
            const foundSession = oSessions.find((s) => {
                return s.sessionId == oScreen.sessionId && !s.archived.get();
            });
            if (!foundSession) {
                return;
            }
            const data: SwitcherDataType = {
                sessionName: foundSession.name.get(),
                sessionId: foundSession.sessionId,
                sessionIdx: foundSession.sessionIdx.get(),
                screenName: oScreen.name.get(),
                screenId: oScreen.screenId,
                screenIdx: oScreen.screenIdx.get(),
                icon: this.getTabIcon(oScreen),
                color: this.getTabColor(oScreen),
            };
            this.options.push(data);
        });

        mobx.action(() => {
            this.sOptions.replace(this.sortOptions(this.options).slice(0, MaxOptionsToDisplay));
        })();

        document.addEventListener("keydown", this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    componentDidUpdate() {
        const currFocusedIdx = this.focusedIdx.get();

        // Check if selectedIdx has changed
        if (currFocusedIdx !== this.prevFocusedIdx) {
            const optionElement = this.optionRefs[currFocusedIdx]?.current;

            if (optionElement) {
                optionElement.scrollIntoView({ block: "nearest" });
            }

            // Update prevFocusedIdx for the next update cycle
            this.prevFocusedIdx = currFocusedIdx;
        }
        if (currFocusedIdx >= this.sOptions.length && this.sOptions.length > 0) {
            this.setFocusedIndex(this.sOptions.length - 1);
        }
    }

    @boundMethod
    getTabIcon(screen: Screen): string {
        let tabIcon = "default";
        const screenOpts = screen.opts.get();
        if (screenOpts != null && !util.isBlank(screenOpts.tabicon)) {
            tabIcon = screenOpts.tabicon;
        }
        return tabIcon;
    }

    @boundMethod
    getTabColor(screen: Screen): string {
        let tabColor = "default";
        const screenOpts = screen.opts.get();
        if (screenOpts != null && !util.isBlank(screenOpts.tabcolor)) {
            tabColor = screenOpts.tabcolor;
        }
        return tabColor;
    }

    @boundMethod
    handleKeyDown(e) {
        if (e.key === "Escape") {
            this.closeModal();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const newIndex = this.calculateNewIndex(e.key === "ArrowUp");
            this.setFocusedIndex(newIndex);
        } else if (e.key === "Enter") {
            e.preventDefault();
            this.handleSelect(this.focusedIdx.get());
        }
    }

    @boundMethod
    calculateNewIndex(isUpKey) {
        const currentIndex = this.focusedIdx.get();
        if (isUpKey) {
            return Math.max(currentIndex - 1, 0);
        } else {
            return Math.min(currentIndex + 1, this.sOptions.length - 1);
        }
    }

    @boundMethod
    setFocusedIndex(index) {
        mobx.action(() => {
            this.focusedIdx.set(index);
        })();
    }

    @boundMethod
    closeModal(): void {
        GlobalModel.modalsModel.popModal();
    }

    @boundMethod
    handleSelect(index: number): void {
        const selectedOption = this.sOptions[index];
        if (selectedOption.sessionIdx === -1) {
            GlobalCommandRunner.switchView(selectedOption.viewData.value);
            this.closeModal();
            return;
        }
        if (selectedOption) {
            GlobalCommandRunner.switchScreen(selectedOption.screenId, selectedOption.sessionId);
            this.closeModal();
        }
    }

    @boundMethod
    handleSearch(val: string): void {
        let sOptions: SwitcherDataType[];
        if (val == "") {
            sOptions = this.sortOptions(this.options).slice(0, MaxOptionsToDisplay);
        } else {
            sOptions = this.filterOptions(val);
            sOptions = this.sortOptions(sOptions);
            if (sOptions.length > MaxOptionsToDisplay) {
                sOptions = sOptions.slice(0, MaxOptionsToDisplay);
            }
        }
        mobx.action(() => {
            this.sOptions.replace(sOptions);
            this.focusedIdx.set(0);
        })();
    }

    @mobx.computed
    @boundMethod
    filterOptions(searchInput: string): SwitcherDataType[] {
        const searchLower = searchInput.toLowerCase();

        let filteredScreens = this.options.filter((tab) => {
            if (searchInput.includes("/")) {
                const [sessionFilter, screenFilter] = searchInput.split("/").map((s) => s.trim().toLowerCase());
                return (
                    tab.sessionName.toLowerCase().includes(sessionFilter) &&
                    tab.screenName.toLowerCase().includes(screenFilter)
                );
            } else {
                return (
                    tab.sessionName.toLowerCase().includes(searchLower) ||
                    tab.screenName.toLowerCase().includes(searchLower)
                );
            }
        });

        if (searchLower.length > 0) {
            const additionalFiltered = additionalOptions.filter((item) =>
                item.viewData?.label.toLowerCase().includes(searchLower)
            );
            filteredScreens = filteredScreens.concat(additionalFiltered);
        }

        return filteredScreens;
    }

    @mobx.computed
    @boundMethod
    sortOptions(options: SwitcherDataType[]): SwitcherDataType[] {
        const mainOptions = options.filter((o) => o.sessionIdx !== -1);
        mainOptions.sort((a, b) => {
            const aInCurrentSession = a.sessionIdx === this.activeSessionIdx;
            const bInCurrentSession = b.sessionIdx === this.activeSessionIdx;

            // Tabs in the current session are sorted by screenIdx
            if (aInCurrentSession && bInCurrentSession) {
                return a.screenIdx - b.screenIdx;
            }
            // a is in the current session and b is not, so a comes first
            else if (aInCurrentSession) {
                return -1;
            }
            // b is in the current session and a is not, so b comes first
            else if (bInCurrentSession) {
                return 1;
            }
            // Both are in different, non-current sessions - sort by sessionIdx and then by screenIdx
            else {
                if (a.sessionIdx === b.sessionIdx) {
                    return a.screenIdx - b.screenIdx;
                } else {
                    return a.sessionIdx - b.sessionIdx;
                }
            }
        });

        const additionalOptions = options.filter((o) => o.sessionIdx === -1);
        additionalOptions.sort((a, b) => a.viewData?.label.localeCompare(b.viewData?.label));

        return mainOptions.concat(additionalOptions);
    }

    @boundMethod
    renderOption(option: SwitcherDataType, index: number): JSX.Element {
        if (!this.optionRefs[index]) {
            this.optionRefs[index] = createRef();
        }
        return (
            <div
                key={option.sessionId + "/" + option.screenId}
                ref={this.optionRefs[index]}
                className={cn("search-option unselectable", {
                    "focused-option": this.focusedIdx.get() === index,
                })}
                onClick={() => this.handleSelect(index)}
            >
                <If condition={option.sessionIdx != -1}>
                    <TabIcon icon={option.icon} color={option.color} />
                    <div className="tabname">
                        #{option.sessionName} / {option.screenName}
                    </div>
                </If>
                <If condition={option.sessionIdx == -1}>
                    <div className="tabname">{option.viewData?.label}</div>
                </If>
            </div>
        );
    }

    render() {
        let option: SwitcherDataType;
        let index: number;
        return (
            <Modal className="tabswitcher-modal">
                <div className="wave-modal-body">
                    <div className="textfield-wrapper">
                        <TextField
                            onChange={this.handleSearch}
                            maxLength={400}
                            autoFocus={true}
                            decoration={{
                                startDecoration: (
                                    <InputDecoration position="start">
                                        <div className="tabswitcher-search-prefix">Go to:</div>
                                    </InputDecoration>
                                ),
                                endDecoration: (
                                    <InputDecoration>
                                        <Tooltip
                                            message={`Type to filter workspaces, tabs and views.`}
                                            icon={<i className="fa-sharp fa-regular fa-circle-question" />}
                                        >
                                            <i className="fa-sharp fa-regular fa-circle-question" />
                                        </Tooltip>
                                    </InputDecoration>
                                ),
                            }}
                        />
                    </div>
                    <div className="list-container">
                        <div ref={this.listWrapperRef} className="list-container-inner">
                            <div className="options-list">
                                <For each="option" index="index" of={this.sOptions}>
                                    {this.renderOption(option, index)}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }
}

export { TabSwitcherModal };
