// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from "react";
import * as mobxReact from "mobx-react";
import * as mobx from "mobx";
import { sprintf } from "sprintf-js";
import { boundMethod } from "autobind-decorator";
import { For } from "tsx-control-statements/components";
import cn from "classnames";
import { debounce } from "throttle-debounce";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { GlobalModel, GlobalCommandRunner, Session, Screen } from "../../../model/model";
import { renderCmdText } from "../../common/common";
import { ReactComponent as SquareIcon } from "../../assets/icons/tab/square.svg";
import { ReactComponent as ActionsIcon } from "../../assets/icons/tab/actions.svg";
import { ReactComponent as AddIcon } from "../../assets/icons/add.svg";
import * as constants from "../../appconst";
import { Reorder, AnimatePresence } from "framer-motion";

import "../workspace.less";
import "./tabs.less";

dayjs.extend(localizedFormat);

type OV<V> = mobx.IObservableValue<V>;

@mobxReact.observer
class ScreenTabs extends React.Component<{ session: Session }, { showingScreens: Screen[] }> {
    tabsRef: React.RefObject<any> = React.createRef();
    tabRefs: { [screenId: string]: React.RefObject<any> } = {};
    lastActiveScreenId: string = null;
    scrolling: OV<boolean> = mobx.observable.box(false, { name: "screentabs-scrolling" });

    dragEndTimeout = null;
    screensReactionDisposer = null;
    stopScrolling_debounced: () => void;

    constructor(props: any) {
        super(props);
        this.stopScrolling_debounced = debounce(1500, this.stopScrolling.bind(this));
        this.state = {
            showingScreens: this.screens,
        };
        this.screens.forEach((screen) => {
            this.tabRefs[screen.screenId] = React.createRef();
        });
    }

    @mobx.computed
    get activeScreenId(): string {
        let { session } = this.props;
        if (session) {
            return session.activeScreenId.get();
        }
    }

    @mobx.computed
    get screens(): Screen[] {
        if (this.activeScreenId) {
            let showingScreens = [];
            // console.log("this.activeScreenId", this.activeScreenId);
            let screens = GlobalModel.getSessionScreens(this.props.session.sessionId);
            // console.log("screens", screens);

            for (let screen of screens) {
                if (!screen.archived.get() || this.activeScreenId == screen.screenId) {
                    showingScreens.push(screen);
                }
            }
            return showingScreens;
        }
    }

    // updateShowingScreens() {
    //     let { session } = this.props;
    //     if (session) {
    //         let activeScreenId = session.activeScreenId.get();
    //         let screens = GlobalModel.getSessionScreens(session.sessionId);
    //         let showingScreens = [];
    //         // let showingScreens = screens.filter(screen =>
    //         //     !screen.archived.get() || activeScreenId === screen.screenId
    //         // ).sort((a, b) => a.screenIdx.get() - b.screenIdx.get());
    //         for (let screen of screens) {
    //             if (!screen.archived.get() || activeScreenId == screen.screenId) {
    //                 showingScreens.push(screen);
    //             }
    //         }
    //         this.setState({ showingScreens });
    //     }
    // }

    @boundMethod
    handleNewScreen() {
        let { session } = this.props;
        GlobalCommandRunner.createNewScreen();
    }

    @boundMethod
    handleSwitchScreen(screenId: string) {
        let { session } = this.props;
        if (session == null) {
            return;
        }
        if (session.activeScreenId.get() == screenId) {
            return;
        }
        let screen = session.getScreenById(screenId);
        if (screen == null) {
            return;
        }
        GlobalCommandRunner.switchScreen(screenId);
    }

    componentDidMount(): void {
        // // Set up a reaction to update showingScreens when screens changes.
        // this.screensReactionDisposer = mobx.reaction(
        //     () => this.screens,
        //     (screens) => {
        //         // Initialize tabRefs with refs for each screen
        //         screens.forEach((screen) => {
        //             this.tabRefs[screen.screenId] = React.createRef();
        //         });
        //         console.log("this.tabRefs=========", this.tabRefs);
        //         // this.setState({ showingScreens: screens });
        //     }
        // );
        this.componentDidUpdate();
    }

    componentWillUnmount() {
        // Dispose the reaction when the component unmounts.
        if (this.screensReactionDisposer) {
            this.screensReactionDisposer();
        }

        if (this.dragEndTimeout) {
            clearTimeout(this.dragEndTimeout);
        }
    }

    componentDidUpdate(): void {
        let { session } = this.props;
        let activeScreenId = session.activeScreenId.get();
        if (activeScreenId !== this.lastActiveScreenId) {
            if (this.tabsRef.current) {
                let tabElem = this.tabsRef.current.querySelector(
                    sprintf('.screen-tab[data-screenid="%s"]', activeScreenId)
                );
                if (tabElem) {
                    tabElem.scrollIntoView();
                }
            }
            this.lastActiveScreenId = activeScreenId;
        }
    }

    // componentDidUpdate(): void {
    //     let { session } = this.props;
    //     let activeScreenId = session.activeScreenId.get();
    //     if (activeScreenId != this.lastActiveScreenId && this.tabsRef.current) {
    //         let tabElem = this.tabsRef.current.querySelector(
    //             sprintf('.screen-tab[data-screenid="%s"]', activeScreenId)
    //         );
    //         if (tabElem != null) {
    //             tabElem.scrollIntoView();
    //         }
    //     }
    //     this.lastActiveScreenId = activeScreenId;
    // }

    stopScrolling(): void {
        mobx.action(() => {
            this.scrolling.set(false);
        })();
    }

    @boundMethod
    handleScroll() {
        if (!this.scrolling.get()) {
            mobx.action(() => {
                this.scrolling.set(true);
            })();
        }
        this.stopScrolling_debounced();
    }

    // @boundMethod
    // handleDragEnd(event, info, screenId) {
    //     const TAB_WIDTH = 175; // Width of each tab
    //     const draggedTabOffset = Math.floor(info.point.x); // Dragged distance in pixels

    //     // Original position of the dragged tab (0-indexed)
    //     const draggedTabIndex = this.screens.findIndex((tab) => tab.screenId === screenId);

    //     // Calculate the index change based on the dragged offset
    //     console.log("draggedTabOffset", draggedTabOffset);
    //     let indexChange;
    //     if (draggedTabOffset < 0) {
    //         indexChange = Math.floor(draggedTabOffset / TAB_WIDTH);
    //         console.log("neg", draggedTabOffset / TAB_WIDTH);
    //     } else {
    //         indexChange = Math.ceil(draggedTabOffset / TAB_WIDTH);
    //         console.log("pos", draggedTabOffset / TAB_WIDTH);
    //     }

    //     console.log("Math.floor(draggedTabOffset / TAB_WIDTH)", Math.floor(draggedTabOffset / TAB_WIDTH));

    //     console.log("indexChange", indexChange);
    //     // Calculate the new index
    //     let newIndex = indexChange;

    //     // Clamp the new index within the valid range
    //     newIndex = Math.max(0, Math.min(indexChange, this.screens.length - 1));

    //     console.log("newIndex", newIndex);

    //     // Update your state or model with the new index
    // }

    @boundMethod
    handleDragEnd(event, info, screenId) {
        if (this.dragEndTimeout) {
            clearTimeout(this.dragEndTimeout);
        }

        // Wait for the potential animation to complete
        this.dragEndTimeout = setTimeout(() => {
            const TAB_WIDTH = 175;
            console.log("this.tabRefs", this.tabRefs);
            const tabElement = this.tabRefs[screenId].current;
            const finalTabPosition = tabElement.offsetLeft;

            // Calculate the new index based on the final position
            const newIndex = Math.floor(finalTabPosition / TAB_WIDTH);

            console.log("newIndex", newIndex + 1);

            // Update your state or model with the new index
            // Remember to handle any necessary adjustments if your indexing is not 0-based
        }, 100); // Replace ANIMATION_DURATION with the duration of your tab movement animation
    }

    @boundMethod
    openScreenSettings(e: any, screen: Screen): void {
        e.preventDefault();
        e.stopPropagation();
        mobx.action(() => {
            GlobalModel.screenSettingsModal.set({ sessionId: screen.sessionId, screenId: screen.screenId });
        })();
        GlobalModel.modalsModel.pushModal(constants.SCREEN_SETTINGS);
    }

    renderTabIcon = (screen: Screen): React.ReactNode => {
        const tabIcon = screen.getTabIcon();
        if (tabIcon === "default" || tabIcon === "square") {
            return (
                <div className="icon svg-icon">
                    <SquareIcon className="left-icon" />
                </div>
            );
        }
        return (
            <div className="icon fa-icon">
                <i className={`fa-sharp fa-solid fa-${tabIcon}`}></i>
            </div>
        );
    };

    renderTab(screen: Screen, activeScreenId: string, index: number): JSX.Element {
        let tabIndex = null;
        if (index + 1 <= 9) {
            tabIndex = <div className="tab-index">{renderCmdText(String(index + 1))}</div>;
        }
        let settings = (
            <div onClick={(e) => this.openScreenSettings(e, screen)} title="Actions" className="tab-gear">
                <ActionsIcon className="icon hoverEffect " />
            </div>
        );
        let archived = screen.archived.get() ? (
            <i title="archived" className="fa-sharp fa-solid fa-box-archive" />
        ) : null;

        let webShared = screen.isWebShared() ? (
            <i title="shared to web" className="fa-sharp fa-solid fa-share-nodes web-share-icon" />
        ) : null;

        return (
            <Reorder.Item
                ref={this.tabRefs[screen.screenId]}
                value={screen}
                id={screen.name.get()}
                initial={{ opacity: 0, y: 30 }}
                animate={{
                    opacity: 1,
                    // backgroundColor: isSelected ? "#f3f3f3" : "#fff",
                    y: 0,
                    transition: { duration: 0.15 },
                }}
                exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
                // whileDrag={{
                //     backgroundColor:
                //         "linear-gradient(180deg, rgba(88, 193, 66, 0.2) 9.34%, rgba(88, 193, 66, 0.03) 44.16%, rgba(88, 193, 66, 0) 86.79%)",
                // }}
                // className={isSelected ? "selected" : ""}
                data-screenid={screen.screenId}
                className={cn(
                    "screen-tab",
                    { "is-active": activeScreenId == screen.screenId, "is-archived": screen.archived.get() },
                    "color-" + screen.getTabColor()
                )}
                onPointerDown={() => this.handleSwitchScreen(screen.screenId)}
                onContextMenu={(event) => this.openScreenSettings(event, screen)}
                onDragEnd={(event, info) => {
                    console.log("onDragEnd==============");
                    this.handleDragEnd(event, info, screen.screenId);
                }}
            >
                {this.renderTabIcon(screen)}
                <div className="tab-name truncate">
                    {archived}
                    {webShared}
                    {screen.name.get()}
                </div>
                {/* {tabIndex} */}
                {settings}
            </Reorder.Item>
            // <div
            //     key={screen.screenId}
            //     data-screenid={screen.screenId}
            //     className={cn(
            //         "screen-tab",
            //         { "is-active": activeScreenId == screen.screenId, "is-archived": screen.archived.get() },
            //         "color-" + screen.getTabColor()
            //     )}
            //     onClick={() => this.handleSwitchScreen(screen.screenId)}
            //     onContextMenu={(event) => this.openScreenSettings(event, screen)}
            // >
            //     {this.renderTabIcon(screen)}
            //     <div className="tab-name truncate">
            //         {archived}
            //         {webShared}
            //         {screen.name.get()}
            //     </div>
            //     {tabIndex}
            //     {settings}
            // </div>
        );
    }

    render() {
        let { showingScreens } = this.state;
        console.log("showingScreens", showingScreens);
        let { session } = this.props;
        if (session == null) {
            return null;
        }
        let screen: Screen | null = null;
        let index = 0;
        // let showingScreens = [];
        let activeScreenId = session.activeScreenId.get();
        // let screens = GlobalModel.getSessionScreens(session.sessionId);
        // for (let screen of screens) {
        //     if (!screen.archived.get() || activeScreenId == screen.screenId) {
        //         showingScreens.push(screen);
        //     }
        // }
        // showingScreens.sort((a, b) => {
        //     let aidx = a.screenIdx.get();
        //     let bidx = b.screenIdx.get();
        //     if (aidx < bidx) {
        //         return -1;
        //     }
        //     if (aidx > bidx) {
        //         return 1;
        //     }
        //     return 0;
        // });
        return (
            <div className="screen-tabs-container">
                <div
                    className={cn("screen-tabs", { scrolling: this.scrolling.get() })}
                    ref={this.tabsRef}
                    onScroll={this.handleScroll}
                >
                    <Reorder.Group
                        as="ul"
                        axis="x"
                        onReorder={(tabs: Screen[]) => {
                            this.setState({ showingScreens: tabs });
                        }}
                        className="tabs"
                        values={showingScreens}
                    >
                        <AnimatePresence initial={false}>
                            <For each="screen" index="index" of={showingScreens}>
                                <React.Fragment key={screen.screenId}>
                                    {this.renderTab(screen, activeScreenId, index)}
                                </React.Fragment>
                            </For>
                        </AnimatePresence>
                    </Reorder.Group>
                    <div key="new-screen" className="new-screen" onClick={this.handleNewScreen}>
                        <AddIcon className="icon hoverEffect" />
                    </div>
                </div>
            </div>
        );
    }
}

export { ScreenTabs };
