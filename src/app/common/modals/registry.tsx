// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import React from "preact/compat";
import {
    AboutModal,
    AlertModal,
    CreateRemoteConnModal,
    ViewRemoteConnDetailModal,
    EditRemoteConnModal,
    TabSwitcherModal,
    SessionSettingsModal,
    ScreenSettingsModal,
    LineSettingsModal,
    UserInputModal,
} from "@/modals";
import * as constants from "@/app/appconst";

const modalsRegistry: { [key: string]: React.ComponentType } = {
    [constants.ABOUT]: AboutModal,
    [constants.CREATE_REMOTE]: CreateRemoteConnModal,
    [constants.VIEW_REMOTE]: ViewRemoteConnDetailModal,
    [constants.EDIT_REMOTE]: EditRemoteConnModal,
    [constants.ALERT]: AlertModal,
    [constants.SCREEN_SETTINGS]: ScreenSettingsModal,
    [constants.SESSION_SETTINGS]: SessionSettingsModal,
    [constants.LINE_SETTINGS]: LineSettingsModal,
    [constants.TAB_SWITCHER]: TabSwitcherModal,
    [constants.USER_INPUT]: UserInputModal,
};

export { modalsRegistry };
