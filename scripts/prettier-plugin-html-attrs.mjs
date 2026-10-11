import { parsers as htmlParsers, printers as htmlPrinters } from 'prettier/plugins/html';

const MIN_ATTRS_TO_BREAK = 3;

const htmlPrinter = htmlPrinters.html;

export const parsers = {
	html: htmlParsers.html,
};

export const printers = {
	html: {
		...htmlPrinter,
		print(path, options, print, ...rest) {
			const attrsCount = path.node?.attrs?.length ?? 0;
			const singleAttributePerLine = attrsCount >= MIN_ATTRS_TO_BREAK;

			return htmlPrinter.print(path, { ...options, singleAttributePerLine }, print, ...rest);
		},
	},
};
