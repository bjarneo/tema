return {
	{
		"loctvl842/monokai-pro.nvim",
		name = "monokai-pro",
		priority = 1000,
		config = function()
			require("monokai-pro").setup({
				terminal_colors = true,
				devicons = true,
				styles = {
					comment = { italic = true },
					keyword = { italic = true },
					type = { italic = true },
					storageclass = { italic = true },
					structure = { italic = true },
					parameter = { italic = true },
					annotation = { italic = true },
					tag_attribute = { italic = true },
				},
				filter = "octagon", -- Use the Octagon variant
				inc_search = "background",
				background_clear = {
					"toggleterm",
					"telescope",
					"renamer",
					"notify",
				},
				plugins = {
					bufferline = {
						underline_selected = false,
						underline_visible = false,
					},
					indent_blankline = {
						context_highlight = "default",
						context_start_underline = false,
					},
				},
			})
			vim.cmd([[colorscheme monokai-pro]])
		end,
	},
	{
		"LazyVim/LazyVim",
		opts = {
			colorscheme = "monokai-pro",
		},
	},
}
