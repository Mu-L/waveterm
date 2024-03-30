// Copyright 2023, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRef, RefObject, JSX } from "preact";
import { PureComponent, ReactNode } from "preact/compat";
import * as mobxReact from "mobx-preact";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import cn from "classnames";
import { GlobalModel } from "@/models";

import "./markdown.less";

function LinkRenderer(props: any): any {
    let newUrl = "https://extern?" + encodeURIComponent(props.href);
    return (
        <a href={newUrl} target="_blank" rel={"noopener"}>
            {props.children}
        </a>
    );
}

function HeaderRenderer(props: any, hnum: number): any {
    return <div className={cn("title", "is-" + hnum)}>{props.children}</div>;
}

function CodeRenderer(props: any): any {
    return <code>{props.children}</code>;
}

@mobxReact.observer
class CodeBlockMarkdown extends PureComponent<{ children: ReactNode; codeSelectSelectedIndex?: number }, {}> {
    blockIndex: number;
    blockRef: RefObject<HTMLPreElement>;

    constructor(props) {
        super(props);
        this.blockRef = createRef();
        this.blockIndex = GlobalModel.inputModel.addCodeBlockToCodeSelect(this.blockRef);
    }

    render() {
        let clickHandler: (e: JSX.TargetedMouseEvent<HTMLElement>, blockIndex: number) => void;
        let inputModel = GlobalModel.inputModel;
        clickHandler = (e: JSX.TargetedMouseEvent<HTMLElement>, blockIndex: number) => {
            inputModel.setCodeSelectSelectedCodeBlock(blockIndex);
        };
        let selected = this.blockIndex == this.props.codeSelectSelectedIndex;
        return (
            <pre
                ref={this.blockRef}
                className={cn({ selected: selected })}
                onClick={(event) => clickHandler(event, this.blockIndex)}
            >
                {this.props.children}
            </pre>
        );
    }
}

@mobxReact.observer
class Markdown extends PureComponent<{ text: string; style?: any; extraClassName?: string; codeSelect?: boolean }, {}> {
    CodeBlockRenderer(props: any, codeSelect: boolean, codeSelectIndex: number): any {
        if (codeSelect) {
            return <CodeBlockMarkdown codeSelectSelectedIndex={codeSelectIndex}>{props.children}</CodeBlockMarkdown>;
        } else {
            const clickHandler = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
                let blockText = (e.target as HTMLElement).innerText;
                if (blockText) {
                    blockText = blockText.replace(/\n$/, ""); // remove trailing newline
                    navigator.clipboard.writeText(blockText);
                }
            };
            return <pre onClick={(event) => clickHandler(event)}>{props.children}</pre>;
        }
    }

    render() {
        let text = this.props.text;
        let codeSelect = this.props.codeSelect;
        let curCodeSelectIndex = GlobalModel.inputModel.getCodeSelectSelectedIndex();
        let markdownComponents = {
            a: LinkRenderer,
            h1: (props) => HeaderRenderer(props, 1),
            h2: (props) => HeaderRenderer(props, 2),
            h3: (props) => HeaderRenderer(props, 3),
            h4: (props) => HeaderRenderer(props, 4),
            h5: (props) => HeaderRenderer(props, 5),
            h6: (props) => HeaderRenderer(props, 6),
            code: (props) => CodeRenderer(props),
            pre: (props) => this.CodeBlockRenderer(props, codeSelect, curCodeSelectIndex),
        };
        return (
            <div className={cn("markdown content", this.props.extraClassName)} style={this.props.style}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {text}
                </ReactMarkdown>
            </div>
        );
    }
}

export { Markdown };
