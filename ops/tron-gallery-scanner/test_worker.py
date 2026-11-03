import unittest

from worker import decide


class DecideTest(unittest.TestCase):
    def test_clean(self):
        r = decide([{"label": "normal", "score": 0.97}, {"label": "nsfw", "score": 0.03}], 0.8)
        self.assertEqual(r["verdict"], "clean")
        self.assertEqual(r["labels"], [])

    def test_flagged(self):
        r = decide([{"label": "nsfw", "score": 0.91}, {"label": "normal", "score": 0.09}], 0.8)
        self.assertEqual(r["verdict"], "flagged")
        self.assertEqual(r["labels"], ["nudity"])
        self.assertIn("91%", r["reason"])

    def test_threshold_is_inclusive(self):
        self.assertEqual(decide([{"label": "NSFW", "score": 0.8}], 0.8)["verdict"], "flagged")


if __name__ == "__main__":
    unittest.main()
